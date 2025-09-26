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
  
  // Conectar ao WebSocket específico (OTC ou regular) - VERSÃO CORRIGIDA
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
            }, 10000);
            
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
                    
                  default:
                    // Verificar se o evento é um ativo que estamos ouvindo
                    const subscriptions = isOtc ? this.otcSubscriptions : this.regularSubscriptions;
                    
                    if (subscriptions.has(message.event)) {
                      try {
                        const data = JSON.parse(message.data);
                        
                        // Notificar handlers globais
                        this.notifyGlobalHandlers(`${message.event}-${typeStr.toLowerCase()}`, data);
                        
                        // Notificar handlers específicos
                        this.handleTickerData(message.event, data, isOtc);
                      } catch (e) {
                        // silent
                      }
                    } else {
                      // Notificar handlers globais
                      this.notifyGlobalHandlers(`unknown-${typeStr.toLowerCase()}`, message);
                    }
                }
              } catch (error) {
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
  
  // TODOS OS OUTROS MÉTODOS SERÃO COPIADOS DO ARQUIVO ORIGINAL...
  // (incluindo os métodos privados e públicos que não foram alterados)
  
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
  
  // Método interno para inscrição em um canal
  private subscribeToChannelInternal(channel: string, isOtc: boolean): void {
    const socket = isOtc ? this.otcWebSocket : this.regularWebSocket;
    const isConnected = isOtc ? this.isOtcConnected : this.isRegularConnected;
    
    if (!socket || !isConnected || socket.readyState !== WebSocket.OPEN) {
      // Adicionar à fila se não estiver conectado ou pronto
      if (!this.pendingSubscriptions.some(p => p.channel === channel && p.isOtc === isOtc)) {
        this.pendingSubscriptions.push({ channel, isOtc });
      }
      return;
    }
    
    try {
      const subscribePayload = {
        event: 'pusher:subscribe',
        data: {
          channel: channel
        }
      };
      
      socket.send(JSON.stringify(subscribePayload));
    } catch (error) {
      console.log('⚠️ Erro ao enviar inscrição WebSocket:', error);
      // Adicionar à fila para tentar novamente
      if (!this.pendingSubscriptions.some(p => p.channel === channel && p.isOtc === isOtc)) {
        this.pendingSubscriptions.push({ channel, isOtc });
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
  
  // Status da conexão
  public get isConnectedStatus(): boolean {
    return this.isOtcConnected || this.isRegularConnected;
  }
  
  // Método público para inscrever em um ativo específico
  public subscribeToAsset(assetSymbol: string, handler?: (data: any) => void): void {
    const isOtc = this.isOtcAsset(assetSymbol);
    
    // Adicionar à lista de inscrições
    if (isOtc) {
      this.otcSubscriptions.add(assetSymbol);
    } else {
      this.regularSubscriptions.add(assetSymbol);
    }
    
    // Adicionar handler se fornecido
    if (handler) {
      const handlers = isOtc ? this.otcMessageHandlers : this.regularMessageHandlers;
      if (!handlers.has(assetSymbol)) {
        handlers.set(assetSymbol, []);
      }
      handlers.get(assetSymbol)?.push(handler);
    }
    
    // Tentar inscrever-se no canal
    this.subscribeToChannelInternal(assetSymbol, isOtc);
  }
  
  // Método público para inscrever no canal do usuário
  public subscribeToUserChannel(userId: string, handler?: (data: any) => void): void {
    const userChannelName = `user-${userId}`;
    
    // Por default, usar WebSocket regular para eventos de usuário
    this.regularSubscriptions.add(userChannelName);
    
    // Adicionar handler se fornecido
    if (handler) {
      if (!this.regularMessageHandlers.has(userChannelName)) {
        this.regularMessageHandlers.set(userChannelName, []);
      }
      this.regularMessageHandlers.get(userChannelName)?.push(handler);
    }
    
    // Tentar inscrever-se no canal
    this.subscribeToChannelInternal(userChannelName, false);
  }
  
  // Método público para remover inscrição de um ativo
  public unsubscribeFromAsset(assetSymbol: string): void {
    const isOtc = this.isOtcAsset(assetSymbol);
    
    // Remover da lista de inscrições
    if (isOtc) {
      this.otcSubscriptions.delete(assetSymbol);
      this.otcMessageHandlers.delete(assetSymbol);
    } else {
      this.regularSubscriptions.delete(assetSymbol);
      this.regularMessageHandlers.delete(assetSymbol);
    }
    
    // Enviar comando de desinscrição
    const socket = isOtc ? this.otcWebSocket : this.regularWebSocket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      const unsubscribePayload = {
        event: 'pusher:unsubscribe',
        data: {
          channel: assetSymbol
        }
      };
      
      socket.send(JSON.stringify(unsubscribePayload));
    }
  }
  
  // Método público para desconectar
  public disconnect(): void {
    if (this.otcWebSocket) {
      this.otcWebSocket.close(1000, 'Manual disconnect');
      this.otcWebSocket = null;
      this.isOtcConnected = false;
    }
    
    if (this.regularWebSocket) {
      this.regularWebSocket.close(1000, 'Manual disconnect');
      this.regularWebSocket = null;
      this.isRegularConnected = false;
    }
    
    // Limpar handlers
    this.globalMessageHandlers.length = 0;
    this.specialEventHandlers.clear();
    this.otcMessageHandlers.clear();
    this.regularMessageHandlers.clear();
    
    // Limpar inscrições
    this.otcSubscriptions.clear();
    this.regularSubscriptions.clear();
    this.pendingSubscriptions.length = 0;
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
}

// Singleton para garantir uma única instância
let pusherServiceInstance: PusherService | null = null;

export function getPusherService(): PusherService {
  if (!pusherServiceInstance) {
    pusherServiceInstance = new PusherService();
  }
  return pusherServiceInstance;
}