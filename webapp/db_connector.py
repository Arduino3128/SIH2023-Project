import bcrypt
from pymongo import MongoClient
import pyotp
import json


class Database:
	def __init__(self):
		pass

	def connect(self, connectionString, dbName, colName, colDevName):
		self.client = MongoClient(connectionString)
		self.database = self.client[dbName]
		self.collection = self.database[colName]
		self.device_collection = self.database[colDevName]

	def verify_user(self, username, password):
		_userinfo = self.collection.find_one({"UserInfo.Username": username})
		if _userinfo:
			_password = _userinfo["UserInfo"]["Password"]
			return bool(bcrypt.checkpw(password.encode(), _password.encode()))
		return False

	def register_user(self, username, password):
		if not self.check_user(username):
			try:
				_hashed_pwd = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
				_document = {
					"UserAsset": {},
					"UserInfo": {
						"Username": username,
						"Password": _hashed_pwd.decode(),
					},
				}
				self.collection.insert_one(_document)
				return True
			except:
				return False
		return False

	def check_user(self, username):
		_userinfo = self.collection.find_one({"UserInfo.Username": username})
		if _userinfo:
			return True
		return False

	def fetch_probe(self, username, password):
		try:
			if self.verify_user(username, password):
				_userinfo = self.collection.find_one({"UserInfo.Username": username})
				if _userinfo:
					return _userinfo["UserAsset"]
			return {}
		except:
			return {}

	def fetch_single_probe(self, username, farm_id, device_id):
		try:
			_dev_info = self.collection.find_one(
				{
					"$and": [
						{"UserInfo.Username": username},
						{f"UserAsset.{farm_id}.ProbeModule.{device_id}": {"$exists": True}},
					]
				}
			)
			if _dev_info:
				return _dev_info["UserAsset"][farm_id]["ProbeModule"][device_id]
			return {}
		except:
			return {}	

	def set_valve_state(self, farm_id, dev_id, value):
		try:
			query = {
				f"UserAsset.{farm_id}.ProbeModule.{dev_id}": {"$exists": True}
			}
			data = {
				"$set": {
					f"UserAsset.{farm_id}.ProbeModule.{dev_id}.ValveState": int(value)
				}
			}
			_result = self.collection.update_one(query, data)
			if _result.modified_count > 0:
				return {"update_probe":True}
			else:
				return {"update_probe":False}
		except:
			return {"update_probe":False}
	
	def get_device_info(self, device_id):
		_dev_info = self.device_collection.find_one({"device.id": device_id})
		return _dev_info

	def farm_exists(self,username,farm_id):
		_farm_info = self.collection.find_one(
			{
				"$and": [
					{"UserInfo.Username": username},
					{f"UserAsset.{farm_id}": {"$exists": True}},
				]
			}
		)
		if _farm_info:
			return True
		return False

	def check_asset(self, username, device_id, device_type, _info):
		if device_type == "SoilProbeModule":
			_dev_info = self.collection.find_one(
				{
					"$and": [
						{"UserInfo.Username": username},
						{f"UserAsset.{_info['device']['registered_to']}.ProbeModule.{device_id}": {"$exists": True}},
					]
				}
			)
		elif device_type == "ComputeModule":
			_dev_info = self.collection.find_one(
				{
					"$and": [
						{"UserInfo.Username": username},
						{f"UserAsset.{_info['device']['registered_to']}": {"$exists": True}},
					]
				}
			)
		if _dev_info:
			return True
		return False

	def reregister_device(self, username, device_id, location, alias_name, farm_id, _info):
		if _info['device']["type"]=="SoilProbeModule":
			data = {"$unset": {f"UserAsset.{_info['device']['registered_to']}.ProbeModule.{device_id}": 1}}
			query = {"UserInfo.Username": username}
			self.collection.update_one(query, data)
			data = {
				"$set": {
					f"UserAsset.{farm_id}.ProbeModule.{device_id}": {
						"Location": location,
						"AliasName":alias_name,
						"MACID": _info["device"]["mac_id"],
						"ValveState":0,
						"SensorData": {
							"Humidity": 0.0,
							"Temperature": 0.0,
							"SWI": 0.0,
						},
					}
				}
			}
			query = {"UserInfo.Username": username}
			_result = self.collection.update_one(query, data)
			if _result:
				if _result.modified_count > 0:
					self.device_collection.update_one(
								{"device.id": device_id},
								{"$set": {"device.registered": True,"device.registered_to": farm_id}},
							)
					return True
		elif _info['device']["type"]=="ComputeModule":
			data = {"$set": {f"UserAsset.{farm_id}.Location":location, f"UserAsset.{farm_id}.AliasName":alias_name}}
			query = {"UserInfo.Username": username}
			_result = self.collection.update_one(query, data)
			if _result:
				if _result.modified_count > 0:
					return True
		return False

	def register_device(self, username, password, device_id, location, alias_name, farm_id=0):
		try:
			_result = None
			_info = self.get_device_info(device_id)
			if _info:
				_status = not _info["device"]["registered"]
				if self.verify_user(username, password):
					if _status:
						if _info["device"]["type"] == "ComputeModule":
							data = {
								"$set": {
									f"UserAsset.{device_id}": {
										"ProbeModule": {},
										"AliasName":alias_name,
										"Location": location,
										"MACID": _info["device"]["mac_id"],
									}
								}
							}
							query = {"UserInfo.Username": username}
							_result = self.collection.update_one(query, data)
						elif (
							_info["device"]["type"] == "SoilProbeModule"
							and farm_id != None and self.farm_exists(username, farm_id)
						):
							data = {
								"$set": {
									f"UserAsset.{farm_id}.ProbeModule.{device_id}": {
										"Location": location,
										"AliasName":alias_name,
										"MACID": _info["device"]["mac_id"],
										"ValveState":0,
										"SensorData": {
											"Humidity": 0.0,
											"Temperature": 0.0,
											"SWI": 0.0,
										},
									}
								}
							}
							query = {"UserInfo.Username": username}
							_result = self.collection.update_one(query, data)
					else:
						if (self.check_asset(
							username, device_id, _info["device"]["type"], _info
						) and self.farm_exists(username, farm_id)):
							if self.reregister_device(
								username, device_id, location, alias_name, farm_id, _info
							):
								return {"status": "REREGISTERED"}
							else:
								return {"status": "FAIL"}
						else:
							return {"status": "NOTUSERFAIL"}

				if _result:
					if _result.modified_count > 0:
						self.device_collection.update_one(
							{"device.id": device_id},
							{"$set": {"device.registered": True,"device.registered_to": farm_id}},
						)
						return {"status": "REGISTERED"}
			return {"status": "FAIL"}
		except Exception as ERROR:
			print(ERROR)
			return {"status": f"FAIL: {ERROR}"}

	def verify_device_request(self, dev_id, token, totp):
		_dev_request = self.device_collection.find_one(
			{"$and": [{"device.id": dev_id}, {"device.api_key": token}]}
		)
		if _dev_request:
			totp_obj = pyotp.TOTP(_dev_request["device"]["totp_key"])
			if totp_obj.verify(totp):
				return True
		return False

	def fetch_farm_list(self,username):
		_farm_list = self.collection.find_one({"UserInfo.Username":username})
		if _farm_list:
			return _farm_list.get("UserAsset")
		return {}

	def api(self, dev_id, farm_id, value_type, token, totp, value):
		try:
			if self.verify_device_request(dev_id, token, totp):
				query = {}
				data = {}
				match value_type:
					case "SetSensorData":
						query = {
							f"UserAsset.{farm_id}.ProbeModule.{dev_id}": {"$exists": True}
						}
						data = {
							"$set": {
								f"UserAsset.{farm_id}.ProbeModule.{dev_id}.SensorData": json.loads(
									value
								)
							}
						}
	
						_result = self.collection.update_one(query, data)
						if _result.modified_count > 0:
							return {value_type:True}
						else:
							return {value_type:False}
							
					case "GetValveState":
						query = {
							f"UserAsset.{farm_id}.ProbeModule.{dev_id}": {"$exists": True}
						}
						_result = self.collection.find_one(query)
						if _result:
							return {value_type :_result["UserAsset"][farm_id]["ProbeModule"][dev_id]["ValveState"]}
			
					case "SetValveState":
						query = {
							f"UserAsset.{farm_id}.ProbeModule.{dev_id}": {"$exists": True}
						}
						data = {
							"$set": {
								f"UserAsset.{farm_id}.ProbeModule.{dev_id}.ValveState": int(value)
							}
						}
						_result = self.collection.update_one(query, data)
						if _result.modified_count > 0:
							return {value_type:True}
						else:
							return {value_type:False}
					case other:
						return {"Error":"Invalid Parameter"}
			return {"Error":"Authentication Failure"}
		except Exception as ERROR:
			return {"Error":ERROR}