from django.http import HttpResponse

# imported from client.py, but these are python 2.7 libraries
# replace urllib2 with urllib.request
# import urllib2

from urllib import request

import time
import json
import random
import threading

from users.models import OrderHistory
from django.contrib.auth.models import User

class SessionManager():
    def __init__(self):
        # Internal memory
        self.session_manager = {}
        self.canceled_session = {}
        self.sid_internal_mapping = {}

        self.removed_session_cache = []
        self.resumed_session_cache = []

        self.channel = None
        self.user_id = None
        # Server API URLs
        self.QUERY = "http://localhost:8080/query?id={}"
        self.ORDER = "http://localhost:8080/order?id={}&side=sell&qty={}&price={}"

        # Event flags
        self.start_flag = threading.Event()
        self.stop_flag = threading.Event()

        # Create a thread
        self.thread = threading.Thread(target=self.run)

    def set_user(self, uid):
        # use username instead of uid here.
        self.user = User.objects.get(id=uid)

    def save_order(self, quantity, order_size, order_discount, sid):
        order = OrderHistory.create(quantity, order_size, order_discount, self.user)

        self.sid_internal_mapping[sid] = order

    def reset(self):
        # Stop the current trading thread
        self.stop_flag.set()

        # Save everything in the cache to database
        tmp = list(self.session_manager.values()) + list(self.canceled_session.values())
        for session in tmp:
            status = 'Canceled'
            # Update the order in the database
            trading_logs = json.dumps(session.trading_logs)
            self.sid_internal_mapping[session.session_id].update(status=status, remaining_quantity=session.quantity, 
                pnl=session.pnl, trading_logs=trading_logs)

        # Reset cache to empty
        self.session_manager.clear()
        self.canceled_session.clear()

        self.removed_session_cache.clear()
        self.resumed_session_cache.clear()

        # Reset channel --> last child order might be executed, but will not be sent to front-end
        self.channel = None

        # Re-create a thread
        self.thread = threading.Thread(target=self.run)


    def set_channel(self, channel):
        if not self.channel:
            self.channel = channel

    def removeSession(self, sid, remove_type):
        # Validation check
        if sid not in self.session_manager:
            return

        session = self.session_manager[sid]

        self.removed_session_cache.append({
            "instrument_id": sid,
            "message_type": remove_type,
            "remaining_quantity": session.quantity,
            "pnl": session.pnl
            })

        # Backup the canceled order for resuming and restarting
        if remove_type == 'canceled_order':
            self.canceled_session[sid] = session

        if remove_type == 'finished_order':
            status = 'Finished'
            # Update the order in the database
            trading_logs = json.dumps(session.trading_logs)
            self.sid_internal_mapping[sid].update(status=status, remaining_quantity=session.quantity, 
                                                pnl=session.pnl, trading_logs=trading_logs)
        
        # Remove the session from the current session manager
        del self.session_manager[sid]

    def add_session(self, sid, session):
        # Validation check
        if sid in self.session_manager:
            return

        self.session_manager[sid] = session

    def resume_canceled_session(self, sid):
        # Validation check
        if sid not in self.canceled_session or sid in self.session_manager:
            return

        # Retrieve the canceled_order and put it into session manager
        self.add_session(sid, self.canceled_session[sid])
        del self.canceled_session[sid]

        self.resumed_session_cache.append({
            "instrument_id": sid,
            "message_type": "resume_order",
            "remaining_quantity": self.session_manager[sid].quantity,
            "pnl": self.session_manager[sid].pnl
        })


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

        # Clear the stop flag at the beginning
        if self.stop_flag.is_set():
            self.stop_flag.clear()

        while not self.stop_flag.is_set():
            # Pass by 1 second
            time.sleep(1)
            
            # Quote the market
            quote_json, price = self.quote()

            # remove the termiated session
            del_sid = [session.session_id for session in self.session_manager.values() if session.terminate]
            for sid in del_sid:
                self.removeSession(sid, 'finished_order')

            return_list = self.resumed_session_cache + self.removed_session_cache + [quote_json]
            
            # For each order
            if self.session_manager:
                for session in self.session_manager.values():
                    message_json = session.trade(price)

                    if message_json:
                        return_list.append(message_json)

            if self.channel:
                # Send the combined order execution list
                self.channel.send({
                    "text": json.dumps(return_list)
                })

            # Empty the removed session list
            self.removed_session_cache.clear()
            self.resumed_session_cache.clear()

        # Reset start and stop flag
        self.start_flag.clear()
        self.stop_flag.clear()


class Session(object):
    def __init__(self, session_id, quantity, order_size, order_discount, total_time):
        self.session_id = session_id
        self.quantity = quantity
        self.order_size = order_size
        self.order_discount = order_discount

        # Store the original quantity
        self.ori_quantity = quantity
        self.time = total_time

        # a value to return at the end of trade function
        self.pnl = 0

        # the time to break between each bid attempt
        self.set_bid_window()
        self.step = 1

        # a paramter to terminate trading when the orders aren't complete yet
        self.terminate = False

        # Store the trading logs
        self.trading_logs = []

    def set_bid_window(self):
        '''
        a function that determines bid_window by remaining_quantity and remaining_time
        '''
        execution_times = self.quantity // self.order_size
        if self.quantity % self.order_size != 0:
            execution_times += 1

        self.bid_window = self.time // execution_times

        # More child orders than remaining time
        if self.bid_window == 0:
            self.bid_window = 1 # Set to the minimum bid window


    def trade(self, price):
        '''
        in: a socket channel to pipeline data to users client interface

        a function that keeps talking to the market until 
        1. quantity of this session is done
        2. the terminate is set to true
        '''

        # Server API URLs
        ORDER = "http://localhost:8080/order?id={}&side=sell&qty={}&price={}"

        message = None

        if self.quantity <= 0:
            self.terminate = True
            return message

        # 1 second has passed --> update remaining time
        self.time -= 1

        # If time's up --> last second --> sell all shares
        if self.time == 0:
            order_size = self.quantity
            sell_price = price * 0.5 # Hardcode here

            message = self.execute_order(order_size, sell_price)
        else:
            # If meets an order execution time
            if self.step < self.bid_window:
                self.step += 1
            else:
                self.step = 1

                # Attempt to execute a sell order. By only referencing the last price we retrieved
                order_size = min(self.quantity, self.order_size)
                sell_price = price * (1 - float(self.order_discount) / 100)

                message = self.execute_order(order_size, sell_price)

        if message:
            self.trading_logs.append(message)

        return message

    def execute_order(self, order_size, sell_price):
        message = None

        # Server API URLs
        ORDER = "http://localhost:8080/order?id={}&side=sell&qty={}&price={}"

        # Attempt to execute a sell order. By only referencing the last price we retrieved
        order_args = (order_size, sell_price)

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
            unfilled_message = {
                    "instrument_id": self.session_id,
                    "message_type": "unfilled_order",
                    "quote": "",
                    "timestamp": order['timestamp'],
                    "remaining_quantity": self.quantity,
                    "sold_quantity": "",
                    "sold_price": "",
                    "pnl": self.pnl 
                }


            # Reset the bid_window if an unfilled order occurs
            self.set_bid_window()

            message = unfilled_message

        return message


def ws_disconnect(message):
    sm.reset()


def ws_message(message):
    # ASGI WebSocket packet-received and send-packet message types
    # both have a "text" key for their textual data.
    '''
    This function checks the format of information received from the frontend and 
    execute different functions including 
    '''
    content = json.loads(message.content['text'])
    request_type = content['request_type']

    if request_type == 'init_system':

        if not sm.start_flag.is_set():
            sm.start_flag.set()
            
            # Set reply the channel
            sm.set_channel(message.reply_channel)
            
            # Get the user id and
            user_id = content['user_id']
            sm.set_user(user_id)
            
            # Start the thread
            sm.thread.start()

    else:
        instrument_id = content['instrument_id']

        if request_type == 'order_request':

            # Initialize order parameters
            quantity = int(content['quantity'])
            order_size = int(content['order_size'])
            order_discount = int(content['order_discount'])
            total_time = int(content['sell_duration'])

            # Init a session instance
            session = Session(instrument_id, quantity, order_size, order_discount, total_time)

            # Save the order to data base
            sm.save_order(quantity, order_size, order_discount, instrument_id)

            # Add the session instance to the Session Manager
            sm.add_session(instrument_id, session)
        
        elif request_type == 'cancel_request':
            sm.removeSession(instrument_id, 'canceled_order')

        elif request_type == 'resume_request':
            sm.resume_canceled_session(instrument_id)

        elif request_type == 'customize_request':
            order_size = int(content['order_size'])
            order_discount = int(content['order_discount'])
            total_time = int(content['order_duration'])

            sm.session_manager[instrument_id].order_size = order_size;
            sm.session_manager[instrument_id].order_discount = order_discount;
            sm.session_manager[instrument_id].time = total_time;

            # Reset bid_window
            sm.session_manager[instrument_id].set_bid_window()


# Create SessionManager instance
# This is called (only once) when init the system
sm = SessionManager()

