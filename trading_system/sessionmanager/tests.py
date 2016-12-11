from django.test import TestCase

from sessionmanager.sessionmanager import SessionManager, Session
from django.contrib.auth.models import User

class ViewsTester(TestCase):

    def test_index_view(self):
        response = self.client.get('/dashboard/')

        if response.status_code == 200 or response.status_code == 302:
            self.assertEqual(True, True)
        else:
            self.assertEqual(True, False)
        # self.assertEqual(response.status_code, 200)

class SessionManagerUnitTester(TestCase):

    def setUp(self):
        self.sm = SessionManager()

        self.u = User.objects.create(username='test')
        
        self.sm.user = self.u

        self.sm.thread.start()

        instrument_id = 0
        quantity = 100
        order_size = 10
        order_discount = 5
        total_time = 50
        email = 'test@test'

        s = Session(instrument_id, quantity, order_size, order_discount, total_time, email)
        self.sm.add_session(instrument_id, s)

    def tearDown(self):
        # Stop the current trading thread
        self.sm.stop_flag.set()

        # Reset cache to empty
        self.sm.session_manager.clear()
        self.sm.canceled_session.clear()

        self.sm.removed_session_cache.clear()
        self.sm.resumed_session_cache.clear()

        # Reset channel --> last child order might be executed, but will not be sent to front-end
        self.sm.channel = None

        self.u.delete()

    def test_sessionmanager_initialization(self):
        self.assertEqual(len(self.sm.removed_session_cache), 0)
        self.assertEqual(self.sm.channel, None)
        self.assertEqual(len(self.sm.session_manager), 1)

    def test_add_session(self):
        instrument_id = 1
        quantity = 100
        order_size = 10
        order_discount = 5
        total_time = 50
        email = 'test@test'

        s = Session(instrument_id, quantity, order_size, order_discount, total_time, email)
        
        self.sm.add_session(instrument_id, s)

        # Successfully insert a session
        self.assertEqual(len(self.sm.session_manager), 2)

        # No exception
        self.sm.add_session(instrument_id, s)

    def test_remove_session(self):
        self.assertEqual(len(self.sm.session_manager), 1)
        self.assertEqual(len(self.sm.removed_session_cache), 0)

        sid = 0        

        self.sm.removeSession(sid, 'canceled')
        
        self.assertEqual(len(self.sm.session_manager), 0)
        self.assertEqual(len(self.sm.removed_session_cache), 1)

    def test_resume_session(self):
        self.assertEqual(len(self.sm.session_manager), 1)
        self.assertEqual(len(self.sm.removed_session_cache), 0)

        sid = 0        

        self.sm.removeSession(sid, 'canceled_order')
        
        self.assertEqual(len(self.sm.session_manager), 0)
        self.assertEqual(len(self.sm.removed_session_cache), 1)

        self.sm.resume_canceled_session(sid)

        self.assertEqual(len(self.sm.session_manager), 1)
        self.assertEqual(len(self.sm.removed_session_cache), 1)


    def test_quote(self):
        quote_json, price, _ = self.sm.quote()

        self.assertTrue(isinstance(quote_json, dict))
        self.assertEqual(len(quote_json), 9)

        self.assertTrue(isinstance(price, float))

class SessionTester(TestCase):

    def setUp(self):
        self.sm = SessionManager()

    def test_trade_filled(self):
        instrument_id = 0
        quantity = 100
        order_size = 10
        order_discount = 5
        total_time = 50
        email = 'test@test'

        self.s = Session(instrument_id, quantity, order_size, order_discount, total_time, email)

        for _ in range(self.s.bid_window - 1):
            quote_json, price, timestamp = self.sm.quote()

            self.s.set_init_timestamp(timestamp)

            message = self.s.trade(price)
            self.assertEqual(message, None)

        quote_json, price, timestamp = self.sm.quote()

        self.s.set_init_timestamp(timestamp)        
        message = self.s.trade(price)

        self.assertTrue(isinstance(message, dict))
        self.assertEqual(message['message_type'], 'sold_message')
        self.assertEqual(message['remaining_quantity'], max(0, quantity - order_size))

    def test_trade_negative_quantity(self):
        instrument_id = 0
        quantity = -10
        order_size = 10
        order_discount = 5
        total_time = 50
        email = 'test@test'

        self.s = Session(instrument_id, quantity, order_size, order_discount, total_time, email)
        quote_json, price, timestamp = self.sm.quote()

        self.s.set_init_timestamp(timestamp)

        message = self.s.trade(price)
        self.assertIs(message, None)

    def test_trade_unfilled(self):
        instrument_id = 0
        quantity = 100
        order_size = 10
        order_discount = -5
        total_time = 50
        email = 'test@test'

        self.s = Session(instrument_id, quantity, order_size, order_discount, total_time, email)

        for _ in range(self.s.bid_window - 1):
            quote_json, price, timestamp = self.sm.quote()
            self.s.set_init_timestamp(timestamp)
            message = self.s.trade(price)

            self.assertEqual(message, None)

        quote_json, price, timestamp = self.sm.quote()
        
        self.s.set_init_timestamp(timestamp)
        message = self.s.trade(price)

        self.assertTrue(isinstance(message, dict))
        self.assertEqual(message['message_type'], 'unfilled_order')
        self.assertEqual(message['remaining_quantity'], quantity)

    def test_trade_filled_two(self):
        instrument_id = 0
        quantity = 1000
        order_size = 200
        order_discount = 10
        total_time = 50
        email = 'test@test'

        self.s = Session(instrument_id, quantity, order_size, order_discount, total_time, email)

        for _ in range(self.s.bid_window - 1):
            quote_json, price, timestamp = self.sm.quote()
            self.s.set_init_timestamp(timestamp)
            message = self.s.trade(price)
            self.assertEqual(message, None)

        quote_json, price, timestamp = self.sm.quote()
        self.s.set_init_timestamp(timestamp)
        message = self.s.trade(price)

        self.assertTrue(isinstance(message, dict))
        self.assertEqual(message['message_type'], 'sold_message')
        self.assertEqual(message['remaining_quantity'], max(0, quantity - order_size))

    def test_trade_zero_quantity(self):
        instrument_id = 0
        quantity = 0
        order_size = 10
        order_discount = 5
        total_time = 50
        email = 'test@test'

        with self.assertRaises(ZeroDivisionError):
            self.s = Session(instrument_id, quantity, order_size, order_discount, total_time, email)
            quote_json, price, timestamp = self.sm.quote()
            self.s.set_init_timestamp(timestamp)
            message = self.s.trade(price)
            self.assertIs(message, None)

    def test_trade_unfilled_two(self):
        instrument_id = 0
        quantity = 1000
        order_size = 200
        order_discount = -10
        total_time = 50
        email = 'test@test'

        self.s = Session(instrument_id, quantity, order_size, order_discount, total_time, email)

        for _ in range(self.s.bid_window - 1):
            quote_json, price, timestamp = self.sm.quote()
            self.s.set_init_timestamp(timestamp)
            message = self.s.trade(price)
            self.assertEqual(message, None)

        quote_json, price, timestamp = self.sm.quote()
        self.s.set_init_timestamp(timestamp)
        message = self.s.trade(price)
        self.assertTrue(isinstance(message, dict))
        self.assertEqual(message['message_type'], 'unfilled_order')
        self.assertEqual(message['remaining_quantity'], quantity)        
