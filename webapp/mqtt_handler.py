import json
from threading import Thread
from paho.mqtt import client as mqtt_client
import ssl
from db_connector import Database
from dotenv import dotenv_values

class MQTTHandler:
	def __init__(self, mqtt_username, mqtt_password, mqtt_broker, mqtt_port) -> None:
		self.mqtt_username = mqtt_username
		self.mqtt_password = mqtt_password
		self.mqtt_broker = mqtt_broker
		self.mqtt_port = int(mqtt_port)
		self.DB=Database()
		app_config = dotenv_values(".env")
		mongodb_url = app_config["MONGODB_URL"].format(app_config['MONGODB_USER'],app_config['MONGODB_PASS'])
		self.DB.connect(mongodb_url,app_config["MONGODB_DB"],app_config["MONGODB_COLLECTION"])
		self.client = self.connect_mqtt()
		self.client.subscribe("device/#")
		self.client.on_message = self.on_message
		self.client.loop_forever()

	def push_to_db(self, msg):
		try:
			msg_topic = msg.topic.split("/")
			payload = json.loads(str(msg.payload.decode("utf-8")))
			farm_id = msg_topic[1]
			device_id = msg_topic[2]
			data_type = payload["data_type"]
			data_value = payload["data_value"]
			query = {f"UserAsset.{farm_id}.ProbeModule.{device_id}": {"$exists": True}}
			data = {
				"$set": {
					f"UserAsset.{farm_id}.ProbeModule.{device_id}.{data_type}": data_value
				}
			}
			self.DB.update_probe(query,data)
		except:
			pass

	def on_message(self, client, userdata, message):
		self.push_to_db(message)

	def connect_mqtt(self) -> mqtt_client:
		def on_connect(client, userdata, flags, rc):
			if rc == 0:
				print("Connected to MQTT Broker!")
			else:
				print("Failed to connect, return code %d\n", rc)

		client = mqtt_client.Client("Main Server")
		client.on_connect = on_connect
		#client.tls_set(certfile=r"/home/ubuntu/certs/fullchain.pem",keyfile=r"/home/ubuntu/certs/privkey.pem",tls_version=ssl.PROTOCOL_TLSv1_2,)
		#client.tls_insecure_set(True)
		client.username_pw_set(self.mqtt_username, self.mqtt_password)
		client.connect(self.mqtt_broker, self.mqtt_port)

		return client


class MQTTThread:
	def __init__(self, mqtt_username, mqtt_password, mqtt_broker, mqtt_port) -> None:
		self.mqtt_username = mqtt_username
		self.mqtt_password = mqtt_password
		self.mqtt_broker = mqtt_broker
		self.mqtt_port = mqtt_port

	def run(self):
		Thread(
			target=MQTTHandler,
			args=[
				self.mqtt_username,
				self.mqtt_password,
				self.mqtt_broker,
				self.mqtt_port,
			],
		).start()


if __name__=="__main__":
	app_config = dotenv_values(".env")
	MQTTInstance = MQTTThread(app_config["MQTT_USER"],app_config["MQTT_PASS"],app_config["MQTT_BROKER"],app_config["MQTT_PORT"])
	MQTTInstance.run()
	pass
