import re

class Regex():
	def __init__(self):
		pass

	def user_regex(self, username):
		reg = r"^[a-zA-Z0-9_-]{3,20}$"
		if re.match(reg,username):
			return True
		else:
			return False
	
	def pass_regex(self, password):
                reg = r"^(?!\s+$).+"
                if re.match(reg,password):
                        return True
                else:
                        return False

if __name__=="__main__":
	Re = Regex()
	print(Re.user_regex("      "))
	print(Re.user_regex("USSD@#)(JD#"))
	print(Re.user_regex("simple_username-"))
