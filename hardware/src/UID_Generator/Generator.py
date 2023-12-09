import uuid
import random
import pyotp
from bson import ObjectId
import qrcode
from PIL import Image

logo_link = "logo.jpg"
logo = Image.open(logo_link)
basewidth = 400

# adjust image size
wpercent = (basewidth / float(logo.size[0]))
hsize = int((float(logo.size[1]) * float(wpercent)))
logo = logo.resize((basewidth, hsize))
QRcode = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H)

MAC_Prefix = ['0xBA', '0xAF', '0x00']  # Barely Afloat MAC Prefix
API_Key = str(uuid.uuid4())
Device_ID = str(uuid.uuid4())
Device_Type = "SoilProbeModule"
Device_Type = "ComputeModule"
TOTP_Key = pyotp.random_base32()
Obj_ID = str(ObjectId())

for _ in range(0, 3):
    MAC_Prefix.append(hex(random.randint(0, 255)).upper().replace("X", "x"))
MAC_ID = ":".join(MAC_Prefix).replace("0x", "")

Device_String = f"""
DEVICE TYPE: {Device_Type}
DEVICE ID: {Device_ID}
MAC ADDR: {MAC_ID}
API Key: {API_Key}
TOTP Key: {TOTP_Key}
"""
print(Device_String)

MongoDB_String = [
    '{ "_id": { "$oid": "', Obj_ID, '" }, "device": { "id": "', Device_ID,
    '", "type": "', Device_Type, '", "api_key": "', API_Key,
    '", "totp_key": "', TOTP_Key, '", "registered": false, "mac_id": "',
    MAC_ID, '", "registered_to": "NA" } }'
]
MongoDB_String = "".join(MongoDB_String)
print(MongoDB_String)

qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=2,
)

QR_String = '{"DEVICE ID":"' + Device_ID + '","DEVICE TYPE":"' + Device_Type + '"}'

qr.add_data(QR_String)
qr.make(fit=True)

img = qr.make_image(fill_color="black",
                    back_color="white").convert('RGBA').resize((2000, 2000))
pos = ((img.size[0] - logo.size[0]) // 2, (img.size[1] - logo.size[1]) // 2)
img.paste(logo, pos)

img.show()
