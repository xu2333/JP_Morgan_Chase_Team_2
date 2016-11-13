from django.http import HttpResponse
from channels.handler import AsgiHandler

# imported from client.py, but these are python 2.7 libraries
# replace urllib2 with urllib.request
# import urllib2

from urllib import request

import time
import json, csv
import random


class SessionManager(object):

	def __init__(self):
		self.session = {}

	def removeSession(self, sid):
		del self.session[sid]

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

		# a paramter to terminate trading when the orders aren't complete yet
		self.terminate = False

	def trade(self, channel):
		'''
		in: a socket channel to pipeline data to users client interface

		a function that keeps talking to the market until 
		1. quantity of this session is done
		2. the terminate is set to true
		'''

		# Server API URLs
		QUERY = "http://localhost:8080/query?id={}"
		ORDER = "http://localhost:8080/order?id={}&side=sell&qty={}&price={}"

		quotes = []
		sells = []

		while not self.terminate and self.quantity > 0:

			# talk to market
			for _ in range(self.bid_window):
				time.sleep(1)
				response = request.urlopen(QUERY.format(random.random())).read()
				# print("{}".format(response.decode("utf-8")) )
				quote = json.loads(response.decode("utf-8"))
				price = float(quote['top_bid']['price'])
				
				quote_message = {
						"id": self.session_id,
						"message_type": "quote",
						"quote": price,
						"timestamp": quote['timestamp'],
						
						"remaining_quantity": self.quantity,
						"sold_quantity": "",
						"sold_price": "",
						"pnl": self.pnl
					}

				# print(quote)
				channel.send({
					"text": json.dumps(quote_message)
				})

				quotes.append(quote_message)

			# Attempt to execute a sell order. By only referencing the last price we retrieved
			order_args = (self.order_size, price - self.order_discount)
			selling_message = "Executing 'sell' of {:,} @ {:,}".format(*order_args)
			# channel.send({
			# 	"text":{
			# 		"selling_message": selling_message
			# 	}
			# })
			url   = ORDER.format(random.random(), *order_args)
			order = json.loads(request.urlopen(url).read().decode("utf-8"))

			# Update the PnL if the order was filled.
			if order['avg_price'] > 0:
				price    = order['avg_price']
				notional = float(price * self.order_size)
				self.pnl += notional
				self.quantity -= self.order_size
				
				sold_message = {
						"id": 1,
						"message_type": "sold_message",
						"quote": "",
						"timestamp": order['timestamp'],
						"remaining_quantity": self.quantity,
						"sold_quantity": self.order_size,
						"sold_price": price,
						"pnl": self.pnl
					}

				sells.append(json.dumps(sold_message))
				channel.send({
					"text": json.dumps(sold_message)
				})

				print("Sold {:,} for ${:,}/share, ${:,} notional".format(self.order_size, price, notional) )
				print("PnL ${:,}, Qty {:,}".format(self.pnl, self.quantity))

			else:

				unfilled_messagepip = {
						"id": 1,
						"message_type": "unfilled_order",
						"quote": "",
						"timestamp": order['timestamp'],
						"remaining_quantity": self.quantity,
						"sold_quantity": "",
						"sold_price": "",
						"pnl": self.pnl 
					}

				channel.send({
					"text": json.dumps(unfilled_message)
				})

				print("Unfilled order; $%s total, %s qty" % (pnl, qty) )

			time.sleep(1)


order_requested = False


sessions = []

def ws_message(message):
    # ASGI WebSocket packet-received and send-packet message types
    # both have a "text" key for their textual data.
    '''
    This function checks the format of information received from the frontend and 
    execute different functions including 
    1. Initialize a session
    2. ... = =?
    '''


    order_requested = True

    print("Message received")
    print(message.content)

    content = json.loads(message.content['text'])
    print(content)
    # print(content.text)

    instrument_id = content['instrument_id']
    quantity = int(content['quantity'])
    order_size = int(content['order_size'])
    order_discount = int(content['order_discount'])


    print("order size: {}".format(order_size))
    print("quantity: {}".format(quantity))
    print("order_discount: {}".format(order_discount))

    # start a session
    # init with parameters Quantity, size, time?
    session = Session( instrument_id, quantity, order_size, order_discount)
    session.trade(message.reply_channel)
    sessions.append(session)

    while order_requested:

    	from time import sleep
    	sleep(1)

    	# update(message)
    	# call a function to keep sending message

def update(message):
    message.reply_channel.send({
    	"text": "quoted at ...\n",
})