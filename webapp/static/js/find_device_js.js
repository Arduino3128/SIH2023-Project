function isiOS() {
	return ["iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod"].includes(navigator.platform) || navigator.userAgent.includes("Mac") && "ontouchend" in document
}

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

function write_status(text,color="#000000"){
	var _status = document.getElementById("pose");
	_status.innerHTML = text;
	_status.style.color = color;
}

// Function to get the device orientation
function getDeviceOrientation() {
	return new Promise((resolve, reject) => {
		if ("DeviceOrientationEvent" in window) {
				const eventName = isiOS() ? "deviceorientation" : "deviceorientationabsolute";
				window.addEventListener(eventName, (event) => {
					//const alpha = event.alpha; // Compass direction (0-360 degrees)
					event.webkitCompassHeading ? absoluteHeading = event.webkitCompassHeading - 180 : absoluteHeading = 180 + event.alpha, absoluteHeading -= 180, 360 < absoluteHeading && (absoluteHeading -= 360);
					resolve(absoluteHeading);
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
			var turnAngle = (orientation-bearing);
			write_status(`Distance: ${distance.toFixed(2)}m<br>Angle: ${turnAngle.toFixed(2)}deg`);
			map.setCenter([geolocation.lng,geolocation.lat]);
			if (isBoot){
				map.setZoom(17);
				isBoot = false;
			}
			map.setBearing(-orientation);
			my_location_obj.setLngLat(map.getCenter()).setPopup(
				new mapboxgl.Popup({ offset: 25 })
				  .setHTML(
					`<h3><b>You</b></h3><p>Location: ${geolocation.lat}, ${geolocation.lng}</p>`
				  )
			  )
			  .addTo(map);
			my_location_obj.getElement().style.display = null;
			device_location_obj.setLngLat([device_lon,device_lat]).setPopup(
				new mapboxgl.Popup({ offset: 25 })
				  .setHTML(
					`<h3>Device ID: ${device_id}</h3><p>Location: ${device_lat}, ${device_lon}</p>`
				  )
			  )
			  .addTo(map);
			device_location_obj.getElement().style.display = null;
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
			write_status(`Distance: -- m<br>Angle: -- deg`);
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
		
		const formData = new FormData(document.getElementById('data_form'));
		const formDataString = new URLSearchParams(formData).toString();
		const response = await fetch('/dashboard/find_device', {
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

var device_lat = 0;
var device_lon = 0;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var farm_id = urlParams.get('farm_id');
var device_id = urlParams.get('device_id');
var isBoot = true;
mapboxgl.accessToken = 'pk.eyJ1Ijoia2FuYWRuZW1hZGUiLCJhIjoiY2xudmZyZGhwMGl4ZTJsczg2bnF6Zm04biJ9.Bz8pBCnEPjKDtx1CB8THkA';
const map = new mapboxgl.Map({
	container: 'map', // container ID
	style: 'mapbox://styles/mapbox/satellite-streets-v12', // style URL
	center: [device_lon,device_lat], // starting position [lng, lat]
	zoom: 1.75 // starting zoom
});
map.addControl(new mapboxgl.NavigationControl());

var el = document.createElement('div');
el.className = 'my_location_marker';
my_location_obj = new mapboxgl.Marker(el);
my_location_obj.setLngLat(map.getCenter()).setPopup(
	new mapboxgl.Popup({ offset: 25 })
	  .setHTML(
		`<h3><b>You</b></h3><p>Location: ${device_lat}, ${device_lon}</p>`
	  )
  )
  .addTo(map);
my_location_obj.getElement().style.display = "none";
var el = document.createElement('div');
el.className = 'device_location_marker';
device_location_obj = new mapboxgl.Marker(el);
device_location_obj.setLngLat(map.getCenter()).setPopup(
	new mapboxgl.Popup({ offset: 25 })
	  .setHTML(
		`<h3>Device ID: ${device_id}</h3><p>Location: ${device_lat}, ${device_lon}</p>`
	  )
  )
  .addTo(map);
device_location_obj.getElement().style.display = "none";
map.flyTo({
	center:[79.13732323182083, 23.000469399612122], // Fly to the selected target
	zoom:4,
	duration: 5000, // Animate over 12 seconds
	essential: true // This animation is considered essential with
	//respect to prefers-reduced-motion
	});
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
sleep(5000).then(() => {
	get_location();
});
