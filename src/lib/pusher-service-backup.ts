// Serviço para gerenciar a conexão WebSocket com o protocolo Pusher
export class PusherService {
  // Objeto WebSocket exposto para depuração
  public otcWebSocket: WebSocket | null = null;
  public regularWebSocket: WebSocket | null = null;
  
  private isOtcConnected: boolean = false;
  private isRegularConnected: boolean = false;
  
  private otcSubscriptions: Set<string> = new Set();
  private regularSubscriptions: Set<string> = new Set();
  
  private otcMessageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private regularMessageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  
  // Handlers globais para mensagens
  private globalMessageHandlers: ((type: string, data: any) => void)[] = [];
  
  // Handlers específicos para eventos especiais
  private specialEventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  
  // Fila para inscrições pendentes
  private pendingSubscriptions: { channel: string; isOtc: boolean }[] = [];
  
  // URLs dos WebSockets
  private readonly OTC_WEBSOCKET_URL = 'wss://ws-us2.pusher.com/app/43474559fc2d8059c93e?protocol=7&client=js&version=8.4.0-rc2&flash=false';
  private readonly REGULAR_WEBSOCKET_URL = 'wss://ws-sa1.pusher.com/app/35040a820f525e208c5b?protocol=7&client=js&version=8.4.0-rc2&flash=false';
  
  constructor() {
    // Inicializar mapa de handlers de eventos especiais
    this.specialEventHandlers.set('trade-operation', []);
    this.specialEventHandlers.set('change-balance', []);
    this.specialEventHandlers.set('trade-persisted', []);
  }
  
  // Verificar se um ativo é OTC baseado no símbolo
  private isOtcAsset(assetSymbol: string): boolean {
    // Símbolos OTC geralmente têm o sufixo "-OTC"
    return assetSymbol.includes('-OTC');
  }
  
  // Conectar ao WebSocket específico (OTC ou regular)
  private connectToSpecificWebSocket(isOtc: boolean): Promise<void> {
    const url = isOtc ? this.OTC_WEBSOCKET_URL : this.REGULAR_WEBSOCKET_URL;
    const typeStr = isOtc ? 'OTC' : 'Regular';
    
    console.log(`🔌 Tentando conectar WebSocket ${typeStr}:`, url);
    
    return new Promise((resolve, reject) => {
      try {
        // Fechar conexão existente se houver de forma mais segura
        if (isOtc && this.otcWebSocket) {
          try {
            if (this.otcWebSocket.readyState === WebSocket.OPEN || 
                this.otcWebSocket.readyState === WebSocket.CONNECTING) {
              this.otcWebSocket.close(1000, 'Reconnecting');
            }
            this.otcWebSocket = null;
            this.isOtcConnected = false;
          } catch (err) {
            console.log(`⚠️ Erro ao fechar WebSocket ${typeStr} existente:`, err);
          }
        } else if (!isOtc && this.regularWebSocket) {
          try {
            if (this.regularWebSocket.readyState === WebSocket.OPEN || 
                this.regularWebSocket.readyState === WebSocket.CONNECTING) {
              this.regularWebSocket.close(1000, 'Reconnecting');
            }
            this.regularWebSocket = null;
            this.isRegularConnected = false;
          } catch (err) {
            console.log(`⚠️ Erro ao fechar WebSocket ${typeStr} existente:`, err);
          }
        }
        
        // Aguardar um pouco para garantir que a conexão anterior foi fechada
        setTimeout(() => {
          try {
            // Criar nova conexão WebSocket
            const socket = new WebSocket(url);
            
            // Atribuir ao membro correto
            if (isOtc) {
              this.otcWebSocket = socket;
            } else {
              this.regularWebSocket = socket;
            }
            
            // Definir um timeout para verificar se a conexão foi estabelecida
            const connectionTimeout = setTimeout(() => {
              const connected = isOtc ? this.isOtcConnected : this.isRegularConnected;
              if (!connected) {
                console.log(`❌ Timeout de conexão ${typeStr} (10s)`);
                if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
                  socket.close();
                }
                reject(new Error(`Timeout de conexão ${typeStr} excedido`));
              }
            }, 10000); // 10 segundos
            
            socket.onopen = () => {
              console.log(`✅ WebSocket ${typeStr} conectado com sucesso`);
              clearTimeout(connectionTimeout);
              
              // Atualizar estado de conexão
              if (isOtc) {
                this.isOtcConnected = true;
              } else {
                this.isRegularConnected = true;
              }
              
              // Notificar handlers globais
              this.notifyGlobalHandlers(`connected-${typeStr.toLowerCase()}`, {});
              
              // Processar inscrições pendentes
              this.processPendingSubscriptions(isOtc);
              
              resolve();
            };
            
            socket.onclose = (event) => {
              console.log(`🔌 WebSocket ${typeStr} fechado:`, { code: event.code, reason: event.reason });
              clearTimeout(connectionTimeout);
              
              // Atualizar estado de conexão
              if (isOtc) {
                this.isOtcConnected = false;
              } else {
                this.isRegularConnected = false;
              }
              
              // Notificar handlers globais
              this.notifyGlobalHandlers(`disconnected-${typeStr.toLowerCase()}`, {
                code: event.code,
                reason: event.reason
              });
              
              // Se a conexão foi fechada antes de ser estabelecida, rejeitar a Promise
              if (event.code !== 1000 && !((isOtc && this.isOtcConnected) || (!isOtc && this.isRegularConnected))) {
                reject(new Error(`WebSocket ${typeStr} fechado: ${event.reason || event.code}`));
              }
            };
            
            socket.onerror = (error) => {
              console.log(`❌ Erro no WebSocket ${typeStr}:`, error);
              clearTimeout(connectionTimeout);
              
              // Notificar handlers globais
              this.notifyGlobalHandlers(`error-${typeStr.toLowerCase()}`, { error });
              
              reject(error);
            };
            
            // Configurar o manipulador de mensagens, seguindo exatamente a documentação
            socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Seguindo exatamente o exemplo da documentação
            switch (message.event) {
              case "pusher:connection_established":
                // Reinscrever em todos os ativos registrados após conexão
                this.resubscribeAll(isOtc);
                
                // Notificar handlers globais
                this.notifyGlobalHandlers(`pusher:connection_established-${typeStr.toLowerCase()}`, message);
                break;
                
              case "pusher:subscription_succeeded":
                // Notificar handlers globais
                this.notifyGlobalHandlers(`pusher:subscription_succeeded-${typeStr.toLowerCase()}`, message);
                break;
                
              // Eventos especiais conforme a documentação da Homebroker
              case "trade-operation":
                try {
                  // Tentar fazer parse dos dados que vêm como string JSON
                  const parsedData = JSON.parse(message.data);
                  
                  // Verificar se tem a estrutura esperada com 'message'
                  if (parsedData.message) {
                    // Notificar handlers com os dados da mensagem
                    this.notifyGlobalHandlers('trade-operation', parsedData.message);
                    this.notifySpecialEventHandlers('trade-operation', parsedData.message);
                  } else {
                    // Notificar handlers com os dados como estão
                    this.notifyGlobalHandlers('trade-operation', parsedData);
                    this.notifySpecialEventHandlers('trade-operation', parsedData);
                  }
                } catch (parseError) {
                  // Tentar notificar mesmo com erro de parse
                  this.notifyGlobalHandlers('trade-operation', message.data);
                  this.notifySpecialEventHandlers('trade-operation', message.data);
                }
                break;
                
              case "change-balance":
                try {
                  // Verificar se data é uma string ou já é um objeto
                  let balanceData;
                  if (typeof message.data === 'string') {
                    balanceData = JSON.parse(message.data);
                  } else {
                    balanceData = message.data;
                  }
                  
                  // Notificar handlers globais
                  this.notifyGlobalHandlers('change-balance', balanceData);
                  
                  // Notificar handlers específicos para este evento
                  this.notifySpecialEventHandlers('change-balance', balanceData);
                } catch (e) {
                  // Tentar notificar mesmo com erro de parse
                  this.notifyGlobalHandlers('change-balance', message.data);
                  this.notifySpecialEventHandlers('change-balance', message.data);
                }
                break;
                
              case "trade-persisted":
                try {
                  const persistData = JSON.parse(message.data);
                  
                  // Notificar handlers globais
                  this.notifyGlobalHandlers('trade-persisted', persistData);
                  
                  // Notificar handlers específicos para este evento
                  this.notifySpecialEventHandlers('trade-persisted', persistData);
                } catch (e) {
                  // silent
                }
                break;
                
              // Verificar eventos de alteração de saldo com nomes alternativos
              case "balance-update":
              case "balance-change":
              case "update-balance":
                try {
                  let balanceData;
                  if (typeof message.data === 'string') {
                    balanceData = JSON.parse(message.data);
                  } else {
                    balanceData = message.data;
                  }
                  
                  // Notificar como change-balance para manter consistência
                  this.notifyGlobalHandlers('change-balance', balanceData);
                  this.notifySpecialEventHandlers('change-balance', balanceData);
                } catch (e) {
                  // silent
                }
                break;
                
              default:
                // Verificar se o evento é um ativo que estamos ouvindo
                const subscriptions = isOtc ? this.otcSubscriptions : this.regularSubscriptions;
                
                if (subscriptions.has(message.event)) {
                  // Verificando se o evento contém dados de balanço
                  if (typeof message.data === 'string' && 
                     (message.data.includes('balance') || 
                      message.data.includes('saldo') || 
                      message.data.includes('amount'))) {
                    
                    try {
                      const data = JSON.parse(message.data);
                      if (data.balance !== undefined || 
                          data.change !== undefined || 
                          data.amount !== undefined) {
                        
                        // Tratar como um evento de alteração de saldo
                        this.notifyGlobalHandlers('change-balance', data);
                        this.notifySpecialEventHandlers('change-balance', data);
                      }
                    } catch (e) {
                      // silent
                    }
                  }
                  
                  const data = JSON.parse(message.data);
                  
                  // Notificar handlers globais
                  this.notifyGlobalHandlers(`${message.event}-${typeStr.toLowerCase()}`, data);
                  
                  // Notificar handlers específicos
                  this.handleTickerData(message.event, data, isOtc);
                } else {
                  // Verificar se é um evento desconhecido que contém a palavra "balance"
                  if (message.event.includes('balance') || 
                      message.event.includes('saldo') || 
                      (typeof message.data === 'string' && (
                        message.data.includes('balance') || 
                        message.data.includes('saldo')
                      ))) {
                    
                    try {
                      const data = message.data ? 
                        (typeof message.data === 'string' ? JSON.parse(message.data) : message.data) : 
                        {};
                      
                      // Notificar como possível evento de alteração de saldo
                      this.notifyGlobalHandlers('change-balance', data);
                      this.notifySpecialEventHandlers('change-balance', data);
                    } catch (e) {
                      // silent
                    }
                  }
                  
                  // Notificar handlers globais
                  this.notifyGlobalHandlers(`unknown-${typeStr.toLowerCase()}`, message);
                }
            }
          } catch (error) {
            // Verificar se a mensagem contém texto relacionado a saldo
            if (typeof event.data === 'string' && 
               (event.data.includes('balance') || 
                event.data.includes('saldo') || 
                event.data.includes('amount'))) {
              
              // Tentar extrair dados JSON de dentro da string
              try {
                const regex = /{[^{}]*}/g;
                const matches = event.data.match(regex);
                
                if (matches && matches.length > 0) {
                  for (const match of matches) {
                    try {
                      const jsonObj = JSON.parse(match);
                      
                      if (jsonObj.balance !== undefined || 
                          jsonObj.change !== undefined || 
                          jsonObj.amount !== undefined) {
                        
                        // Notificar como evento de alteração de saldo
                        this.notifyGlobalHandlers('change-balance', jsonObj);
                        this.notifySpecialEventHandlers('change-balance', jsonObj);
                      }
                    } catch (jsonError) {
                      // silent
                    }
                  }
                }
              } catch (extractionError) {
                // silent
              }
            }
            
              // Notificar handlers globais
              this.notifyGlobalHandlers(`error-${typeStr.toLowerCase()}`, {
                error,
                data: event.data
              });
            }
            };
            
          } catch (error) {
            console.log(`❌ Erro ao criar WebSocket no setTimeout:`, error);
            reject(error);
          }
        }, 100); // Aguardar 100ms antes de criar nova conexão
        
      } catch (error) {
        console.log(`❌ Erro ao inicializar WebSocket ${typeStr}:`, error);
        // Notificar handlers globais
        this.notifyGlobalHandlers(`error-${typeStr.toLowerCase()}`, { error });
        
        reject(error);
      }
    });
  }
  
  // Método público para conectar ambos ou um tipo específico de WebSocket
  public connect(connectType: 'all' | 'otc' | 'regular' = 'all'): Promise<void> {
    const promises: Promise<void>[] = [];
    
    if (connectType === 'all' || connectType === 'otc') {
      promises.push(this.connectToSpecificWebSocket(true));
    }
    
    if (connectType === 'all' || connectType === 'regular') {
      promises.push(this.connectToSpecificWebSocket(false));
    }
    
    return Promise.all(promises).then(() => {
      // Notificar sobre todas as conexões completadas
      this.notifyGlobalHandlers('all-connections-ready', {});
    });
  }
  
  // Método para registrar um handler global para todos os eventos
  public addGlobalMessageHandler(handler: (type: string, data: any) => void): void {
    this.globalMessageHandlers.push(handler);
  }
  
  // Método para adicionar handler para um evento especial específico
  public addSpecialEventHandler(eventType: string, handler: (data: any) => void): void {
    if (!this.specialEventHandlers.has(eventType)) {
      this.specialEventHandlers.set(eventType, []);
    }
    
    const handlers = this.specialEventHandlers.get(eventType);
    if (handlers) {
      handlers.push(handler);
    }
  }
  
  // Método para notificar handlers de eventos especiais
  private notifySpecialEventHandlers(eventType: string, data: any): void {
    const handlers = this.specialEventHandlers.get(eventType);
    
    if (handlers && handlers.length > 0) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          // silent
        }
      });
    }
  }
  
  // Método para notificar todos os handlers globais
  private notifyGlobalHandlers(type: string, data: any): void {
    for (const handler of this.globalMessageHandlers) {
      try {
        handler(type, data);
      } catch (error) {
        // silent
      }
    }
  }
  
  // Método para processar dados de ticker, conforme a documentação
  private handleTickerData(assetSymbol: string, data: any, isOtc: boolean): void {
    // Notificar handlers específicos deste ticker
    const handlers = isOtc 
      ? this.otcMessageHandlers.get(assetSymbol) 
      : this.regularMessageHandlers.get(assetSymbol);
      
    if (handlers && handlers.length > 0) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          // silent
        }
      });
    }
  }
  
  // Reinscrever em todos os ativos
  private resubscribeAll(isOtc: boolean): void {
    const socket = isOtc ? this.otcWebSocket : this.regularWebSocket;
    const isConnected = isOtc ? this.isOtcConnected : this.isRegularConnected;
    const subscriptions = isOtc ? this.otcSubscriptions : this.regularSubscriptions;
    
    if (!socket || !isConnected) {
      return;
    }
    
    subscriptions.forEach(assetSymbol => {
      this.subscribeToChannelInternal(assetSymbol, isOtc);
    });
  }
  
  // Método interno para inscrição em um canal
  private subscribeToChannelInternal(channel: string, isOtc: boolean): void {
    const socket = isOtc ? this.otcWebSocket : this.regularWebSocket;
    const isConnected = isOtc ? this.isOtcConnected : this.isRegularConnected;
    
    if (!socket || !isConnected) {
      // Adicionar à fila se não estiver conectado
      if (!this.pendingSubscriptions.some(p => p.channel === channel && p.isOtc === isOtc)) {
        this.pendingSubscriptions.push({ channel, isOtc });
      }
      return;
    }
    
    const subscribePayload = {
      event: 'pusher:subscribe',
      data: {
        channel: channel
      
      }
    };
    
    socket.send(JSON.stringify(subscribePayload));
  }
  
  // Processar a fila de inscrições pendentes
  private processPendingSubscriptions(isOtc: boolean): void {
    const subscriptionsToProcess = this.pendingSubscriptions.filter(sub => sub.isOtc === isOtc);
    
    if (subscriptionsToProcess.length > 0) {
      // Remover da fila principal
      this.pendingSubscriptions = this.pendingSubscriptions.filter(sub => sub.isOtc !== isOtc);
      
      subscriptionsToProcess.forEach(sub => {
        // Chamar o método de inscrição novamente, agora que a conexão está aberta
        this.subscribeToChannelInternal(sub.channel, sub.isOtc);
      });
    }
  }
  
  // Método para inscrever-se no canal de eventos privados do usuário
  public subscribeToUserChannel(userId: string): void {
    if (!userId) {
      return;
    }
    
    // Inscrever-se em ambos os WebSockets para garantir que não perdemos nenhum evento
    this.subscribeToChannelInternal(userId, false); // Regular
    this.subscribeToChannelInternal(userId, true);  // OTC
  }
  
  public disconnect(disconnectType: 'all' | 'otc' | 'regular' = 'all'): void {
    if (disconnectType === 'all' || disconnectType === 'otc') {
      if (this.otcWebSocket && this.isOtcConnected) {
        this.otcWebSocket.close(1000, 'Disconnect requested');
        this.isOtcConnected = false;
        this.otcSubscriptions.clear();
        this.otcMessageHandlers.clear();
        
        // Notificar handlers globais
        this.notifyGlobalHandlers('manual_disconnect-otc', {});
      }
    }
    
    if (disconnectType === 'all' || disconnectType === 'regular') {
      if (this.regularWebSocket && this.isRegularConnected) {
        this.regularWebSocket.close(1000, 'Disconnect requested');
        this.isRegularConnected = false;
        this.regularSubscriptions.clear();
        this.regularMessageHandlers.clear();
        
        // Notificar handlers globais
        this.notifyGlobalHandlers('manual_disconnect-regular', {});
      }
    }
  }
  
  // Método para inscrever-se em um ativo
  public subscribeToAsset(assetSymbol: string, handler: (data: any) => void): void {
    // Determinar se é um ativo OTC
    const isOtc = this.isOtcAsset(assetSymbol);
    const typeStr = isOtc ? 'OTC' : 'Regular';
    
    const socket = isOtc ? this.otcWebSocket : this.regularWebSocket;
    const isConnected = isOtc ? this.isOtcConnected : this.isRegularConnected;
    const subscriptions = isOtc ? this.otcSubscriptions : this.regularSubscriptions;
    const messageHandlers = isOtc ? this.otcMessageHandlers : this.regularMessageHandlers;
    
    if (!socket || !isConnected) {
      // Tentar conectar automaticamente ao WebSocket correto
      this.connectToSpecificWebSocket(isOtc)
        .then(() => {
          this.subscribeToAsset(assetSymbol, handler);
        })
        .catch(error => {
          // silent
        });
      
      return;
    }
    
    // Adicionar à lista de inscrições
    subscriptions.add(assetSymbol);
    
    // Registrar o handler para o evento
    if (!messageHandlers.has(assetSymbol)) {
      messageHandlers.set(assetSymbol, []);
    }
    
    // Adicionar o handler à lista de handlers para este ativo
    const handlers = messageHandlers.get(assetSymbol);
    if (handlers) {
      handlers.push(handler);
    }
    
    // Inscrever-se no canal do ativo
    this.subscribeToChannelInternal(assetSymbol, isOtc);
  }
  
  // Método para cancelar inscrição em um ativo
  public unsubscribeFromAsset(assetSymbol: string): void {
    // Determinar se é um ativo OTC
    const isOtc = this.isOtcAsset(assetSymbol);
    const typeStr = isOtc ? 'OTC' : 'Regular';
    
    const socket = isOtc ? this.otcWebSocket : this.regularWebSocket;
    const isConnected = isOtc ? this.isOtcConnected : this.isRegularConnected;
    const subscriptions = isOtc ? this.otcSubscriptions : this.regularSubscriptions;
    const messageHandlers = isOtc ? this.otcMessageHandlers : this.regularMessageHandlers;
    
    if (!socket || !isConnected) {
      return;
    }
    
    // Remover da lista de inscrições
    subscriptions.delete(assetSymbol);
    
    // Remover handlers
    messageHandlers.delete(assetSymbol);
    
    // Enviar evento de cancelamento de inscrição
    const unsubscribePayload = {
      event: 'pusher:unsubscribe',
      data: {
        channel: assetSymbol
      }
    };
    
    socket.send(JSON.stringify(unsubscribePayload));
    
    // Notificar handlers globais
    this.notifyGlobalHandlers(`unsubscribe-${typeStr.toLowerCase()}`, { channel: assetSymbol });
  }
  
  public get isConnectedStatus(): boolean {
    // Retorna verdadeiro se pelo menos um WebSocket estiver conectado
    return this.isOtcConnected || this.isRegularConnected;
  }
  
  public getActiveSubscriptions(): string[] {
    // Combina as inscrições de ambos os tipos
    return [...Array.from(this.otcSubscriptions), ...Array.from(this.regularSubscriptions)];
  }
  
  // Método para verificar a conexão e mostrar detalhes para depuração
  public getDebugInfo(): any {
    return {
      otc: {
        url: this.OTC_WEBSOCKET_URL,
        isConnected: this.isOtcConnected,
        subscriptionsCount: this.otcSubscriptions.size,
        subscriptions: Array.from(this.otcSubscriptions),
        socketState: this.otcWebSocket ? this.getSocketStateString(this.otcWebSocket.readyState) : 'No socket',
      },
      regular: {
        url: this.REGULAR_WEBSOCKET_URL,
        isConnected: this.isRegularConnected,
        subscriptionsCount: this.regularSubscriptions.size,
        subscriptions: Array.from(this.regularSubscriptions),
        socketState: this.regularWebSocket ? this.getSocketStateString(this.regularWebSocket.readyState) : 'No socket',
      },
      specialEventHandlers: {
        'trade-operation': this.specialEventHandlers.get('trade-operation')?.length || 0,
        'change-balance': this.specialEventHandlers.get('change-balance')?.length || 0,
        'trade-persisted': this.specialEventHandlers.get('trade-persisted')?.length || 0
      }
    };
  }
  
  private getSocketStateString(state: number): string {
    switch (state) {
      case WebSocket.CONNECTING: return 'CONNECTING (0)';
      case WebSocket.OPEN: return 'OPEN (1)';
      case WebSocket.CLOSING: return 'CLOSING (2)';
      case WebSocket.CLOSED: return 'CLOSED (3)';
      default: return `UNKNOWN (${state})`;
    }
  }
}

// Singleton para o serviço Pusher
let pusherInstance: PusherService | null = null;

export const getPusherService = (): PusherService => {
  if (!pusherInstance) {
    pusherInstance = new PusherService();
  }
  return pusherInstance;
};