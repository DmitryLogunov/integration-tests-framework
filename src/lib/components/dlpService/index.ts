import uuidv4 from 'uuid/v4';
import {Header, MessageCategory} from "../messages";


function getMessageHeader(category: MessageCategory, action: string, connection_id: string, flow_id: string = ''): Header {
  return {
    category,
    action,
    message_uuid: uuidv4(),
    service_name: global.service_name,
    service_uuid: global.uuid,
    connection_id,
    flow_id
  };
}

export {
  getMessageHeader
}


