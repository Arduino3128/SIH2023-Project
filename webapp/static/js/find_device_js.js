// Function to get the geolocation
async function getGeolocation() {
	return new Promise((resolve, reject) => {
		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const lat = position.coords.latitude;
					const lng = position.coords.longitude;
					resolve({ lat, lng });
				},
				(error) => {
					reject(error);
				}
			);
		} else {
			reject("Geolocation is not supported by this browser.");
		}
	});
}

var device_lat = 0;
var device_lon = 0;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var farm_id = urlParams.get('farm_id');
var device_id = urlParams.get('device_id');

function write_status(text,color="#000000"){
	var _status = document.getElementById("pose");
	_status.innerHTML = text;
	_status.style.color = color;
}

// Function to get the device orientation
function getDeviceOrientation() {
	return new Promise((resolve, reject) => {
		if ("DeviceOrientationEvent" in window) {
			window.addEventListener("deviceorientationabsolute", (event) => {
				const alpha = event.alpha; // Compass direction (0-360 degrees)
				resolve(alpha);
			});
		} else {
			reject("Device orientation is not supported by this browser.");
		}
	});
}

// Function to continuously get geolocation and device orientation every second
async function getLocationAndOrientationEverySecond() {
	try {
		setInterval(async () => {
			var geolocation = await getGeolocation();
			var orientation = await getDeviceOrientation();
			var bearing = calculateInitialBearing(device_lat,device_lon,geolocation.lat,geolocation.lng)
			var distance = calculateDistance(geolocation.lat,geolocation.lng,device_lat,device_lon)
			var compass_val = orientation-bearing
			write_status(`Distance: ${distance.toFixed(2)}m<br>Angle: ${compass_val.toFixed(2 )}deg`);
			document.getElementById("compass").style.transform=`rotate(${compass_val.toFixed(2)}deg)`
			// You can do something with the geolocation and orientation data here
		}, 50); // Fetch data every second (100 milliseconds)
	} catch (error) {
		console.error("Error:", error);
	}
}

function calculateDistance(lat1, lon1, lat2, lon2) {
	const earthRadius = 6371; // Radius of the Earth in kilometers

	// Convert latitude and longitude from degrees to radians
	lat1 = toRadians(lat1);
	lon1 = toRadians(lon1);
	lat2 = toRadians(lat2);
	lon2 = toRadians(lon2);

	// Haversine formula
	const dLat = lat2 - lat1;
	const dLon = lon2 - lon1;
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = earthRadius * c;

	return distance*1000;
}


// Function to calculate the initial bearing between two coordinates
function calculateInitialBearing(lat1, lon1, lat2, lon2) {
	// Convert latitude and longitude from degrees to radians
	lat1 = toRadians(lat1);
	lon1 = toRadians(lon1);
	lat2 = toRadians(lat2);
	lon2 = toRadians(lon2);

	// Calculate the bearing
	const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
	let initialBearing = Math.atan2(y, x);

	// Convert the bearing from radians to degrees
	initialBearing = toDegrees(initialBearing);

	// Normalize the bearing to a value between 0 and 360 degrees
	initialBearing = ((initialBearing + 360) % 360);

	return initialBearing;
}

// Helper function to convert degrees to radians
function toRadians(degrees) {
	return degrees * (Math.PI / 180);
}

// Helper function to convert radians to degrees
function toDegrees(radians) {
	return radians * (180 / Math.PI);
}

async function get_location(){
	try{
		
		var data_response = await get_device(farm_id, device_id);
		const deviceInfoElement = document.getElementById("device-info");
		if (data_response["status"]=="OK"){
			deviceInfoElement.innerHTML = `Locating Device: <br>${device_id}`;
			var device_coords = data_response["location"].split(", ");
			device_lat = parseFloat(device_coords[0])
			device_lon = parseFloat(device_coords[1])
			getLocationAndOrientationEverySecond();
		}
		else{
			write_status(`Distance: --m<br>Angle: --deg`);
			deviceInfoElement.innerHTML = `Could not locate the device!`;
			deviceInfoElement.style.color = "#FF0000";
		}
	}
	catch (e) {
		write_status(`ERROR ${e}`);
		return null;
	}

}

function get_device(farm_id, device_id) {
  return new Promise(async (resolve, reject) => {
	try {
	  const response = await fetch('/dashboard/find_device', {
		headers: {
		  'Accept': 'application/json',
		  'Content-Type': 'application/json'
		},
		credentials: 'include',
		method: 'POST',
		body: JSON.stringify({
		  FarmID: farm_id,
		  DeviceID: device_id,
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

get_location();