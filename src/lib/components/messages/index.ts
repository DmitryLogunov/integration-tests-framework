export interface Message {
  header: Header
  origin: Origin
  body: Body
}


export enum MessageCategory {
  BUSINESS_COMMAND = "business_command",
  BUSINESS_EVENT = "business_event",
  BUSINESS_QUERY = "business_query",
  ADMIN_COMMAND = "admin_command",
  ADMIN_EVENT = "admin_event",
  ADMIN_QUERY = "admin_query"
}


export interface Header {
  category: MessageCategory
  action: string
  message_uuid: string
  service_name: string
  service_uuid: string
  connection_id: string
  flow_id: string
}


export interface Body {
  data: Data
}

export interface Data {
  userId: string
}

export interface Origin {
  from: string
  identity?: Identity
}


export interface Identity {
  client_id?: string
  user_id?: string
  access_token?: string
  realm_name?: string
  roles?: Array<string>
}

export interface KafkaMessage {
  value: string
}