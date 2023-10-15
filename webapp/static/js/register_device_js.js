function write_farm_id(text){
	var _fm_id = document.getElementById("FarmID");
	_fm_id.innerHTML = `Farm ID: ${text}`;
}

function write_status(text,color){
	var _status = document.getElementById("Status");
	_status.innerHTML = text;
	_status.style.color = color;
}

var farm_id;
var data_response;
let shouldPauseVideo = true;
let showPausedBanner = false;
const html5QrCode = new Html5Qrcode("reader");
Html5Qrcode.getCameras().then(devices => {
    if (devices && devices.length) {
        var found = false;
        for (let i = 0; i < devices.length; i++) {
            var cameraId = devices[i].id;
            var cameraLabel = devices[i].label;
            if (cameraLabel.includes("back")) {
                found = true;
                break;
            }
        }
        if (!found) {
            var cameraId = devices[0].id;
        }
        html5QrCode.start(
            cameraId,
            {
                fps: 10,    // Optional, frame per seconds for qr code scanning
                qrbox: { width: 250, height: 250 }  // Optional, if you want bounded box UI
            },
            (decodedText, decodedResult) => {
                onScanSuccess(decodedText, decodedResult)
            },
            (errorMessage) => {
                // parse error, ignore it.
            })
            .catch((err) => {
                // Start failed, handle it.
            });
    }
}).catch(err => {
    // handle err
});
getModuleLocation();



function getModuleLocation() {
    return new Promise((resolve, reject) => {
        // Check if geolocation is supported by the browser
        if ("geolocation" in navigator) {
			html5QrCode.pause(shouldPauseVideo, showPausedBanner);
			write_status("Fetching Location Data....","#FFFF00");
            // Prompt user for permission to access their location
            navigator.geolocation.getCurrentPosition(
                // Success callback function
                (position) => {
                    // Get the user's latitude and longitude coordinates
                    var lat = position.coords.latitude;
                    var lng = position.coords.longitude;

                    // Resolve the Promise with the location data
					const loca = `${lat}, ${lng}`
					write_status(`Got Location: ${loca}`,"#00FF00");
                    resolve(loca);
                },
                // Error callback function
                (error) => {
                    // Reject the Promise with an error
					write_status("Failed to get GPS Lock!","#FF0000");
                    reject(error);
                },
				{
					enableHighAccuracy: true, // Request high-accuracy location
					maximumAge: 0, // Force a fresh location fix
				}
            );
        } else {
            // Geolocation is not supported by the browser
            reject("Geolocation is not supported by this browser.");
        }
    });
}

function checkUUIDFormat(decodedText) {
    const v4 = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
    if (decodedText.match(v4)) {
        return true;
    }
    return false;
}

async function onScanSuccess(decodedText, decodedResult) {
    try {
        var jsonString = JSON.parse(decodedText);
	    
	    if (checkUUIDFormat(jsonString["DEVICE ID"])) {
	        // send Request to register!
	        //alert(jsonString["DEVICE ID"]);
	        if (jsonString["DEVICE TYPE"] == "ComputeModule") {         
				farm_id = jsonString["DEVICE ID"];
	            var device_id = jsonString["DEVICE ID"];
				write_status("Compute Module Scanned!","#00FF00");
	            var dev_location = await getModuleLocation();
				var alias_name = window.prompt("Enter device name: ", device_id)
				var data_response = await register_device(alias_name, farm_id, device_id, dev_location);
				html5QrCode.resume();
				if (data_response["status"]=="REGISTERED"){
					write_farm_id(farm_id);
					write_status("Compute Module Registered!","#00FF00");
				}
				else if (data_response["status"]=="NOTUSERFAIL"){
					farm_id=undefined;
					write_status("Could not register Compute Module","#FF0000");
				}
				else{
					write_farm_id(farm_id);
					write_status("Scan Soil Probe Module to register!","#00FF00");
				}
	        }
	        else if (jsonString["DEVICE TYPE"] == "SoilProbeModule") {
				if (typeof farm_id === 'undefined'){
					write_status("Scan Compute Module First!","#FFFF00");
					return null;
				}
	            var device_id = jsonString["DEVICE ID"];
	            var dev_location = await getModuleLocation();
				write_status(`Soil Probe Module scanned under Farm: ${farm_id}!`,"#FFFF00");
				var alias_name = window.prompt("Enter device name: ", device_id)
				var data_response = await register_device(alias_name, farm_id, device_id, dev_location);
				html5QrCode.resume();
				data_resonse_status = data_response["status"];
				if (data_resonse_status=="REGISTERED")
					write_status("Soil Probe Module Registered!","#00FF00");
				else if (data_resonse_status=="REREGISTERED")
					write_status(`Soil Probe Module re-registered under farm: ${farm_id}<br>Location: ${dev_location}`,"#00FF00");
				else
					write_status("Soil Probe Module Registration Failed!","#FF0000");
	        }
	    }
	}
	catch (e) {
        write_status(`Could not read QR Code!<br>Make sure you are scanning the correct code!`,"#FF0000");
		try {
			html5QrCode.resume();
		} catch (error) {
			
		}
		return null;
    }

}

function register_device(alias_name, farm_id, device_id, dev_location) {
  return new Promise(async (resolve, reject) => {
    try {
		try {
			html5QrCode.pause(shouldPauseVideo, showPausedBanner);
		} catch (error) {
			
		}
      const response = await fetch('/dashboard/register_device', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify({
		  AliasName: alias_name,
          FarmID: farm_id,
          DeviceID: device_id,
          Location: dev_location
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      resolve(data); // Resolve the Promise with the response data
    } catch (error) {
      reject(error); // Reject the Promise with the error
    }
  });
}
