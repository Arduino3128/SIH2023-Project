function isUUID(uuid) {
  const uuidPattern = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return uuidPattern.test(uuid);
}

function write_farm_id(text){
	var _fm_id = document.getElementById("FarmID");
	_fm_id.innerHTML = `Farm ID: ${text}`;
}

function write_status(text,color){
	var _status = document.getElementById("Status");
	_status.innerHTML = text;
	_status.style.color = color;
}

var farm_id = document.getElementsByName("farm_id")[0].value;
if (isUUID(farm_id))
	write_farm_id(farm_id)
else
	farm_id = undefined;

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
			try
			{
				html5QrCode.pause(shouldPauseVideo, showPausedBanner);
			}
			catch(error){}
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

function sleep(ms) {
	  return new Promise(resolve => setTimeout(resolve, ms));
   }

async function onScanSuccess(decodedText, decodedResult) {
    try {
        var jsonString = JSON.parse(decodedText);
	    
	    if (isUUID(jsonString["DEVICE ID"])) {
	        if (jsonString["DEVICE TYPE"] == "ComputeModule") {         
				farm_id = jsonString["DEVICE ID"];
	            var device_id = jsonString["DEVICE ID"];
				write_status("Compute Module Scanned!","#00FF00");
	            var dev_location = await getModuleLocation();
				var alias_name = window.prompt("Enter Compute Module's name: ", device_id);
				if (alias_name==null){
					write_status("Device registration cancelled!","#FF0000");
					farm_id = undefined;
					html5QrCode.resume();
					return null;
				}
				var data_response = await register_device(alias_name, farm_id, device_id, dev_location);
				if (data_response["status"]=="REGISTERED"){
					write_farm_id(farm_id);
					write_status("Compute Module Registered!","#00FF00");
				}
				else if (data_response["status"]=="NOTUSERFAIL" || data_response["status"]=="FAIL"){
					farm_id=undefined;
					write_status("Could not register Compute Module","#FF0000");
				}
				else{
					write_farm_id(farm_id);
					write_status("Scan Soil Probe Module to register!","#00FF00");
				}
				html5QrCode.resume();
	        }
	        else if (jsonString["DEVICE TYPE"] == "SoilProbeModule") {
				if (typeof farm_id === 'undefined'){
					write_status("Scan Compute Module First!","#FFFF00");
					return null;
				}
	            var device_id = jsonString["DEVICE ID"];
	            var dev_location = await getModuleLocation();
				write_status(`Soil Probe Module scanned under Farm: ${farm_id}!`,"#FFFF00");
				var alias_name = window.prompt("Enter Soil Probe Module's name: ", device_id);
				if (alias_name==null){
					write_status("Device registration cancelled!","#FF0000");
					html5QrCode.resume();
					return null;
				}
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
		document.getElementsByName("farm_id")[0].value = farm_id;
		document.getElementsByName("device_id")[0].value = device_id;
		document.getElementsByName("location")[0].value = dev_location;
		document.getElementsByName("alias_name")[0].value = alias_name;
		const formData = new FormData(document.getElementById('data_form'));
		const formDataString = new URLSearchParams(formData).toString();
		const response = await fetch('/dashboard/register_device', {
		  headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		  },
		credentials: 'include',
		method: 'POST',
		body: formDataString
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
