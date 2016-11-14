from django.http import HttpResponse
from channels.handler import AsgiHandler

# imported from client.py, but these are python 2.7 libraries
# replace urllib2 with urllib.request
# import urllib2

from urllib import request

import time
import json, csv
import random
import threading

class SessionManager(threading.Thread):

    def __init__(self):
        threading.Thread.__init__(self)

        self.session_manager = {}
        self.removed_session = []
        self.channel = None
        self.bid_window = 5
        # Server API URLs
        self.QUERY = "http://localhost:8080/query?id={}"
        self.ORDER = "http://localhost:8080/order?id={}&side=sell&qty={}&price={}"

    def set_channel(self, channel):
        if not self.channel:
            self.channel = channel

    def removeSession(self, sid, remove_type):
        
        self.removed_session.append({
            "instrument_id": sid,
            "message_type": remove_type,
            "remaining_quantity": self.session_manager[sid].quantity
            })

        del self.session_manager[sid]

    def add_seesion(self, sid, session):
        if sid in self.session_manager:
            raise ValueError('Repeated sid')

        self.session_manager[sid] = session

    def quote(self):
        # talk to market
        response = request.urlopen(self.QUERY.format(random.random())).read()
        
        quote = json.loads(response.decode("utf-8"))
        price = float(quote['top_bid']['price'])
        
        quote_message = {
                "instrument_id": '',
                "message_type": "quote",
                "quote": price,
                "timestamp": quote['timestamp'],
                
                "remaining_quantity": 0,
                "sold_quantity": "",
                "sold_price": "",
                "pnl": 0
            }

        return quote_message, price
        

    def run(self):
        while True:
            # Pass by 1 second
            time.sleep(1)
            if not self.channel:
                continue

            # Quote the market
            quote_json, price = self.quote()

            # remove the termiated session
            del_sid = [session.session_id for session in self.session_manager.values() if session.terminate]
            for sid in del_sid:
                self.removeSession(sid, 'finished_order')

            return_list = self.removed_session + [quote_json]

            print(return_list)
            
            # For each order
            if self.session_manager:
                for session in self.session_manager.values():
                    order_json = session.trade(price)

                    if order_json:
                        return_list.append(order_json)

            print(return_list)

            self.channel.send({
                "text": json.dumps(return_list)
            })

class Session(object):
    def __init__(self, session_id, quantity, order_size, order_discount):
        self.session_id = session_id
        self.quantity = quantity
        self.order_size = order_size
        self.order_discount = order_discount

        # a value to return at the end of trade function
        self.pnl = 0

        # the time to break between each bid attempt
        self.bid_window = 5
        self.step = 0

        # a paramter to terminate trading when the orders aren't complete yet
        self.terminate = False

    def trade(self, price):
        '''
        in: a socket channel to pipeline data to users client interface

        a function that keeps talking to the market until 
        1. quantity of this session is done
        2. the terminate is set to true
        '''

        # Server API URLs
        QUERY = "http://localhost:8080/query?id={}"
        ORDER = "http://localhost:8080/order?id={}&side=sell&qty={}&price={}"

        message = None

        if self.quantity <= 0:
            self.terminate = True
            return message

        if self.step != self.bid_window:
            self.step += 1

        else:
            self.step = 0

            # Attempt to execute a sell order. By only referencing the last price we retrieved
            order_size = min(self.quantity, self.order_size)
            order_args = (order_size, price - self.order_discount)

            url   = ORDER.format(random.random(), *order_args)
            order = json.loads(request.urlopen(url).read().decode("utf-8"))

            # Update the PnL if the order was filled.
            if order['avg_price'] > 0:
                price    = order['avg_price']
                notional = float(price * order_size)
                self.pnl += notional
                self.quantity -= order_size
                
                sold_message = {
                        "instrument_id": self.session_id,
                        "message_type": "sold_message",
                        "quote": "",
                        "timestamp": order['timestamp'],
                        "remaining_quantity": self.quantity,
                        "sold_quantity": order_size,
                        "sold_price": price,
                        "pnl": self.pnl
                    }

                print("ID = {}, Sold {:,} for ${:,}/share, ${:,} notional".format(self.session_id, order_size, price, notional) )
                print("PnL ${:,}, Qty {:,}".format(self.pnl, self.quantity))

                message = sold_message 
            else:
                unfilled_messagepip = {
                        "instrument_id": self.session_id,
                        "message_type": "unfilled_order",
                        "quote": "",
                        "timestamp": order['timestamp'],
                        "remaining_quantity": self.quantity,
                        "sold_quantity": "",
                        "sold_price": "",
                        "pnl": self.pnl 
                    }

                # print("Unfilled order; $%s total, %s qty" % (pnl, qty) )

                message = unfilled_message

        return message

def ws_message(message):
    # ASGI WebSocket packet-received and send-packet message types
    # both have a "text" key for their textual data.
    '''
    This function checks the format of information received from the frontend and 
    execute different functions including 
    1. Initialize a session
    2. ... = =?
    '''
    print("Message received")
    print(message.content)

    content = json.loads(message.content['text'])
    print(content)

    if content['request_type'] == 'order_request':
    
        instrument_id = content['instrument_id']
        quantity = int(content['quantity'])
        order_size = int(content['order_size'])
        order_discount = int(content['order_discount'])

        print("order size: {}".format(order_size))
        print("quantity: {}".format(quantity))
        print("order_discount: {}".format(order_discount))

        # start a session
        # init with parameters Quantity, size, time?
        sm.set_channel(message.reply_channel)

        session = Session( instrument_id, quantity, order_size, order_discount)

        sm.add_seesion(instrument_id, session)
    
    elif content['request_type'] == 'cancel_request':

        instrument_id = content['instrument_id']

        sm.removeSession(instrument_id, 'canceled_order')


# Start SessionManager
sm = SessionManager()
sm.start()

