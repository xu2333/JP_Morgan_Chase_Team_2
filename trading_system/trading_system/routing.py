from channels.routing import route
from sessionmanager.sessionmanager import ws_message, ws_disconnect

channel_routing = [
    route("websocket.receive", ws_message),
    route("websocket.disconnect", ws_disconnect),
]