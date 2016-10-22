from channels.routing import route
from sessionmanager.sessionmanager import ws_message

channel_routing = [
    route("websocket.receive", ws_message),
]