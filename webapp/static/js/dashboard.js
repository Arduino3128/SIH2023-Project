var probe_list={};
var timer;
var chart_list={};

function createGauge(sensor_data, sensorId) {
	var data = {
		labels: ['Low', 'Moderate', 'Optimal', 'Moderate', 'High'],
		datasets: [{
			label: 'Soil moisture',
			data: [20, 20, 20, 20, 20],
			backgroundColor: [
				'rgba(255, 26, 104,1)',
				'rgba(255, 206, 86,1)',
				'rgba(0, 255, 0, 1)',
				'rgba(255, 206, 86, 1)',
				'rgba(255, 26, 104,1)',
				'rgba(0, 0, 0, 1)'
			],
			/*backgroundColor: [
				'rgba(255, 26, 104, 0.2)',
				'rgba(255, 206, 86, 0.2)',
				'rgba(0, 255, 0, 0.2)',
				'rgba(255, 206, 86, 0.2)',
				'rgba(255, 26, 104, 0.2)',
				'rgba(0, 0, 0, 0.2)'
			],*/
			borderColor: [
				'rgba(255, 26, 104, 1)',
				'rgba(255, 206, 86, 1)',
				'rgba(0, 255, 0, 1)',
				'rgba(255, 206, 86, 1)',
				'rgba(255, 26, 104, 1)',
				'rgba(0, 0, 0, 1)'
			],
			borderWidth: 1,
			circumference: 270,
			rotation: 225,
			cutout: '85%',
			needleValue: 0                //Value of % of soil moisture(0-100)
		}]
	};
	var SWI = sensor_data[sensorId]["SensorData"]["SWI"];
	sensor_data[sensorId]["ChartData"] = data;
	sensor_data[sensorId]["ChartData"].datasets[0].needleValue = SWI;
	var gaugeNeedle = {
		id: 'gaugeNeedle-'+sensorId,
		afterDatasetsDraw(chart, args, plugins) {
			const { ctx, data } = chart;

			ctx.save();
			var needleValue = sensor_data[sensorId]["ChartData"].datasets[0].needleValue;//data.datasets[0].needleValue;

			//console.log(chart.getDatasetMeta(0).data[0].x)
			const xCenter = chart.getDatasetMeta(0).data[0].x;
			const yCenter = chart.getDatasetMeta(0).data[0].y;
			const outerRadius = chart.getDatasetMeta(0).data[0].outerRadius;
			const innerRadius = chart.getDatasetMeta(0).data[0].innerRadius;

			const datatotal = data.datasets[0].data.reduce((a, b) =>
				a + b, 0
			);
			let circumference = ((chart.getDatasetMeta(0).data[0].circumference / Math.PI) / data.datasets[0].data[0]) * needleValue;
			const needleValueAngle = circumference + (3 * Math.PI / 8) + 0.07;
			// console.log(circumference);

			ctx.translate(xCenter, yCenter);        //making needle ka center as (0,0). Intelligentttt <--- Yeh comment definitely saketh ne likha hai
			ctx.rotate(Math.PI * needleValueAngle);

			//Needle
			ctx.beginPath();
			ctx.strokeStyle = 'black';
			ctx.fillStyle = 'black';
			ctx.moveTo(0 - 5, 0);
			ctx.lineTo(0, -(outerRadius + innerRadius) / 2);
			ctx.lineTo(0 + 5, 0);
			ctx.stroke();
			ctx.fill();
			ctx.restore();

			//semi-circle under the needle

			ctx.beginPath();
			ctx.strokeStyle = 'black';
			ctx.fillStyle = 'black';
			ctx.arc(xCenter, yCenter, 5, Math.PI * 0, Math.PI * 2, false);
			ctx.fill();
			ctx.restore();
		}
	}
	var config = {
		type: 'doughnut',
		data,
		options: {
			aspectRatio: 1.8,
			plugins: {
				legend: {
					display: false
				}
			}
		},
		plugins: [gaugeNeedle]
	};

	const canvas = document.createElement('canvas');
	canvas.id = 'myChart-'+sensorId;
	canvas.className = 'canvas';
	const chartBox = document.createElement('div');
	chartBox.className = 'chartBox';
	chartBox.appendChild(canvas);
	const chartCard = document.getElementById(sensorId);
	chartCard.appendChild(chartBox);

	// render init block
	myChart = new Chart(
		document.getElementById('myChart-'+sensorId),
		config
	);
	chart_list[sensorId] = myChart;
	canvas.style.display=null;
}

function clear_gauges(){
	// Call a function with the selected option's value as a parameter
	const gridContainer = document.querySelector(".grid-container");
	gridContainer.innerHTML = ""; // erase everything
}

function update_probes(farm_id){
	timer = setInterval(async function() { 
		function update_value(value){
			try{
				probe_list[value]["ChartData"]["datasets"][0]["needleValue"]=new_data[value]["SensorData"]["SWI"];
				probe_list[value]["SensorData"]=new_data[value]["SensorData"];
				probe_list[value]["ValveState"]=new_data[value]["ValveState"];		
				chart_list[value].update();
				document.getElementsByClassName("last-update")[0].innerHTML = `Last Updated: ${(new Date().toLocaleString()).toUpperCase()}`;
			}
			catch(error){
				
			}
		}
		var new_data = await get_probes(farm_id);
		var probe_data = Object.keys(new_data);
		probe_data.forEach(update_value)
	}, 10000); 
}

function get_probes(farm_id) {
  return new Promise(async (resolve, reject) => {
	try {
		csrf_token = document.getElementsByName("csrf_token")[0].value;
		const formData = new FormData();
		formData.append("type","get_probes");
		formData.append("farm_id",farm_id)
		formData.append("csrf_token",csrf_token);
		const formDataString = new URLSearchParams(formData).toString();
		const response = await fetch('/dashboard', {
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

async function updateValve(sensorId, farmId, value){
  return new Promise(async (resolve, reject) => {
	try {
		csrf_token = document.getElementsByName("csrf_token")[0].value;
		const formData = new FormData();
		formData.append("type","update_probe");
		formData.append("csrf_token",csrf_token);
		formData.append("farm_id",farmId);
		formData.append("device_id",sensorId);
		formData.append("value",value);
		const formDataString = new URLSearchParams(formData).toString();
		const response = await fetch('/dashboard', {
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


function createPopup(probe_list, sensorId, farmId) {
	async function changeValveState(){
		value = document.getElementById("valveState").checked;
		if (value)
			value = 1;
		else
			value = 0;
		probe_list[sensorId]["ValveState"] = value;
		await updateValve(sensorId, farmId, value);
	}
	const popupContainer = document.createElement("div");
	popupContainer.className = "popup-container";

	let soilMoisture = probe_list[sensorId]["SensorData"]["SWI"];
	let temperature = probe_list[sensorId]["SensorData"]["Temperature"];
	let humidity = probe_list[sensorId]["SensorData"]["Humidity"];
	let valveState = probe_list[sensorId]["ValveState"];

	const popup = document.createElement("div");
	popup.className = "popup";

	const l_farmid = document.createElement('p');
	l_farmid.textContent = `Farm ID: ${farmId}`
	popup.appendChild(l_farmid);

	const l_sensorid = document.createElement('p');
	l_sensorid.textContent = `Device ID: ${sensorId}`;
	popup.appendChild(l_sensorid);
	
	popup.appendChild(document.createElement('br'));
	
	const l_soilmoisture = document.createElement('p');
	l_soilmoisture.textContent = `Soil Moisture: ${soilMoisture}%`;
	popup.appendChild(l_soilmoisture);

	const l_temperature = document.createElement('p');
	l_temperature.textContent = `Temperature: ${temperature}°C`;
	popup.appendChild(l_temperature);

	const l_humidity = document.createElement('p');
	l_humidity.textContent = `Humidity: ${humidity}%`;
	popup.appendChild(l_humidity);

	popup.appendChild(document.createElement('br'));

	const l_valvestate_label = document.createElement('label');
	l_valvestate_label.className = "switch";
	const l_valvestate = document.createElement('input');
	l_valvestate.type = "checkbox";
	l_valvestate.id = "valveState";
	l_valvestate.checked = valveState;
	l_valvestate.addEventListener("change", changeValveState); 
	const l_valvestate_span = document.createElement('span');
	l_valvestate_span.className = "slider round";
	const l_valvestate_name = document.createElement('div');
	l_valvestate_name.innerHTML = "Valve:";
	l_valvestate_name.style = `
	color: black;
	position: absolute;
	top: 6px;
	left: 0;
	margin: auto;
	margin-left: -50px;
	`;
	l_valvestate_label.appendChild(l_valvestate);
	l_valvestate_label.appendChild(l_valvestate_span);
	l_valvestate_label.appendChild(l_valvestate_name);
	popup.appendChild(l_valvestate_label);
	
	popup.appendChild(document.createElement('br'));
	
	const l_locatedevice = document.createElement('a');
	l_locatedevice.className = "locate-device"
	l_locatedevice.href = `/dashboard/find_device?farm_id=${farmId}&device_id=${sensorId}`
	l_locatedevice.innerHTML = `<img src="/images/device_locate_green.svg" height="30px"/>Locate Device`;
	popup.appendChild(l_locatedevice);

	const closeButton = document.createElement("button");
	closeButton.className = "close-button";
	closeButton.addEventListener("click", () => {
		document.body.removeChild(popupContainer);
	})

	popupContainer.appendChild(popup);
	popupContainer.appendChild(closeButton);
	document.body.appendChild(popupContainer);
}


function createFarm(probe_list,farmId)
{
	clearInterval(timer);
	document.getElementById("reg_dev_link").href = `/dashboard/register_device?farm_id=${farmId}`
	const no_of_div = Object.keys(probe_list).length;
	const gridContainer = document.querySelector(".grid-container");

	for (let i = 0; i < no_of_div; i++) {
		let sensorId = Object.keys(probe_list)[i];
		const gaugeDiv = document.createElement("div");
		gaugeDiv.id = sensorId;
		gaugeDiv.className = "grid-item";
		gaugeDiv.style.backgroundColor = "transparent";
		gaugeDiv.style.border =  "2px solid #216400";
		gaugeDiv.style.borderRadius =  "15px";
		gaugeDiv.textContent = probe_list[sensorId]["AliasName"]//'Sensor ' + (i + 1);
		gaugeDiv.addEventListener("click", () => createPopup(probe_list,sensorId,farmId));
		gridContainer.appendChild(gaugeDiv);
		createGauge(probe_list,sensorId);
	}
	update_probes(farmId);
	document.getElementsByClassName("last-update")[0].innerHTML = `Last Updated: ${(new Date().toLocaleString()).toUpperCase()}`;
}

function get_farm(alias_name, farm_id, device_id, dev_location) {
  return new Promise(async (resolve, reject) => {
	try {
		csrf_token = document.getElementsByName("csrf_token")[0].value;
		const formData = new FormData();
		formData.append("type","get_farm");
		formData.append("csrf_token",csrf_token);
		const formDataString = new URLSearchParams(formData).toString();
		const response = await fetch('/dashboard', {
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

farm.addEventListener("change", async function () {
	const farm_id = farm.value;
	const farmName = document.querySelector(".farm-name");
	farmName.textContent = farm.options[farm.selectedIndex].text;
	document.getElementsByClassName("last-update")[0].innerHTML = `Fetching Probes...`;
	clear_gauges();
	probe_list = await get_probes(farm_id);
	createFarm(probe_list, farm_id);
});

async function main(){
	function list_farm(value) {
		var x = document.getElementById("farm");
		var option = document.createElement("option");
		option.text = farm[value]["AliasName"];
		option.value = value;
		x.add(option);   
	}
	var farm = await get_farm();
	farm_list = farm;
	farm_list = Object.keys(farm_list);
	farm_list.forEach(list_farm)
	if (farm_list.length){
		document.querySelector(".farm-name").textContent = farm[farm_list[0]]["AliasName"];
		probe_list = await get_probes(farm_list[0]);
		document.getElementById("farm").style.display = "block";
		createFarm(probe_list,farm_list[0]);
	}
	else{
		document.querySelector(".farm-name").textContent = "Add Farm by Scanning the Code.";
		document.getElementsByClassName("last-update")[0].innerHTML = `No Probes Found`;
		document.getElementById("farm").style.display = "none";
	}
}

main();


function openNav() {
  document.getElementById("sidenav").style.width = "250px";
}

/* Set the width of the side navigation to 0 */
function closeNav() {
  document.getElementById("sidenav").style.width = "0";
} 