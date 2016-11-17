from django.test import TestCase

from sessionmanager.sessionmanager import SessionManager, Session

# Create your tests here.
class StaticAnalysis(TestCase):
    pass

class ViewsTester(TestCase):

    def test_index_view(self):
        response = self.client.get('/dashboard/')
        self.assertEqual(response.status_code, 200)


class SessionManagerUnitTester(TestCase):

    def setUp(self):
        self.sm = SessionManager()
        self.sm.start()

        instrument_id = 0
        quantity = 100
        order_size = 10
        order_discount = 5

        s = Session(instrument_id, quantity, order_size, order_discount)        
        self.sm.add_session(instrument_id, s)

    def tearDown(self):
        self.sm.stop_trade_thread()
        
    def test_add_session(self):
        self.assertEqual(len(self.sm.session_manager), 1)

        instrument_id = 1
        quantity = 100
        order_size = 10
        order_discount = 5

        s = Session(instrument_id, quantity, order_size, order_discount)
        
        self.sm.add_session(instrument_id, s)

        # Successfully insert a session
        self.assertEqual(len(self.sm.session_manager), 2)

        # Raise exception for repeated session
        with self.assertRaises(ValueError):
            self.sm.add_session(instrument_id, s)

    def test_remove_session(self):
        self.assertEqual(len(self.sm.session_manager), 1)
        self.assertEqual(len(self.sm.removed_session), 0)

        sid = 0        

        self.sm.removeSession(sid, 'canceled')
        
        self.assertEqual(len(self.sm.session_manager), 0)
        self.assertEqual(len(self.sm.removed_session), 1)

    def test_quote(self):
        quote_json, price = self.sm.quote()

        self.assertTrue(isinstance(quote_json, dict))
        self.assertEqual(len(quote_json), 8)

        self.assertTrue(isinstance(price, float))

class SessionTester(TestCase):

    def setUp(self):
        self.sm = SessionManager()

    def test_trade_filled(self):
        instrument_id = 0
        quantity = 100
        order_size = 10
        order_discount = 5

        self.s = Session(instrument_id, quantity, order_size, order_discount)

        for _ in range(self.s.bid_window):
            quote_json, price = self.sm.quote()
            message = self.s.trade(price)
            self.assertEqual(message, None)

        quote_json, price = self.sm.quote()
        message = self.s.trade(price)
        self.assertTrue(isinstance(message, dict))
        self.assertEqual(message['message_type'], 'sold_message')
        self.assertEqual(message['remaining_quantity'], max(0, quantity - order_size))

    def test_trade_unfilled(self):
        instrument_id = 0
        quantity = 100
        order_size = 10
        order_discount = -5

        self.s = Session(instrument_id, quantity, order_size, order_discount)

        for _ in range(self.s.bid_window):
            quote_json, price = self.sm.quote()
            message = self.s.trade(price)
            self.assertEqual(message, None)

        quote_json, price = self.sm.quote()
        message = self.s.trade(price)
        self.assertTrue(isinstance(message, dict))
        self.assertEqual(message['message_type'], 'unfilled_order')
        self.assertEqual(message['remaining_quantity'], quantity)

        
