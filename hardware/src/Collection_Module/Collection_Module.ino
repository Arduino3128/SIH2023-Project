/*
TODO: Implement zero trust system.
*/

// ------------------ Device Definition --------------------
const String DeviceID = "9e89c5f2-f9fb-4da6-9621-da4541441a7c";
#define TINY_GSM_MODEM_SIM800`
#define SerialMon Serial

// ------------------ Pin Definitions ----------------------
#define SoilPin 10
#define DHTPin 12

#define IN1A 19
#define IN1B 18
#define EN1 5

// ------------------ Libraries ----------------------------
#include "DHT.h"
#include <SoftwareSerial.h>
#include <TinyGsmClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ------------------ DHT-22 Configs -----------------------
#define DHTType DHT22 // DHT 22  (AM2302), AM2321
DHT dht(DHTPin, DHTType);

// ------------------ Capacitive Soil Sensor Configs -------
#define MoistSoilMax 4096 // Max value of ADC if moisture is 100%
#define MoistSoilMin 0    // Min value of ADC if moisture is 0%

// ------------------ TinyGSM -----------------------------
SoftwareSerial SerialAT(2, 3); // RX, TX
const char apn[] = "www";      // www for Vodafone
const char gprsUser[] = "";
const char gprsPass[] = "";
TinyGsm modem(SerialAT);
TinyGsmClient client(modem);
PubSubClient mqtt(client);

// ------------------ Valve Controller --------------------
// bool valveState = false; // false=OFF, true=ON

// ----------------- MQTT ---------------------------------
const char *broker = "barelyafloat.cloudns.nz"; // MQTT URL
const char *topicSoilHumidity = DeviceID + "/SoilHumidity";
const char *topicTemperature = DeviceID + "/Temperature";
const char *topicHumidity = DeviceID + "/Humidity";
const char *topicValve = DeviceID + "/Valve";

void controlValve(bool value = false)
{
    if (value)
    {
        pinMode(IN1A, HIGH);
        pinMode(IN1B, LOW);
        delay(250); // Will have to test this if 250ms is fine.
        pinMode(IN1A, LOW);
        pinMode(IN1B, LOW);
    }
    else
    {
        pinMode(IN1A, LOW);
        pinMode(IN1B, HIGH);
        delay(250); // Will have to test this if 250ms is fine.
        pinMode(IN1A, LOW);
        pinMode(IN1B, LOW);
    }
}

void mqttCallback(char *topic, byte *payload, unsigned int len)
{
    SerialMon.print("Message arrived [");
    SerialMon.print(topic);
    SerialMon.print("]: ");
    SerialMon.write(payload, len);
    SerialMon.println();

    if (String(topic) == String(topicValve))
    {
        controlValve(bool(payload));
    }
}

boolean mqttConnect()
{
    SerialMon.print("Connecting to ");
    SerialMon.print(broker);

    // Or, if you want to authenticate MQTT:
    boolean status = mqtt.connect(broker, "barelyafloatclient", "barelyafloatclient");

    if (status == false)
    {
        SerialMon.println(" fail");
        return false;
    }
    SerialMon.println(" success");
    mqtt.publish(topicInit, "GsmClientTest started");
    mqtt.subscribe(topicValve);
    return mqtt.connected();
}

void setup()
{
    dht.begin();
}

void loop()
{
}