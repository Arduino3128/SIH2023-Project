/*

*/

// ------------------ Sensor Pin Definitions ---------------
#define SoilPin 10
#define DHTPin 12

// ------------------ Libraries ----------------------------
#include "DHT.h"

// ------------------ DHT-22 Configs -----------------------
#define DHTType DHT22 // DHT 22  (AM2302), AM2321
DHT dht(DHTPin, DHTType);

// ------------------ Capacitive Soil Sensor Configs -------
#define MoistSoilMax 4096 // Max value of ADC if moisture is 100%
#define MoistSoilMin 0    // Min value of ADC if moisture is 0%

void setup()
{
    dht.begin();
}

void loop()
{
}