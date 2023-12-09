const loaderElement = document.createElement("div");
loaderElement.setAttribute('id','loader');
loaderElement.setAttribute('class','center');
loaderElement.style = `position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;
	margin: auto;
	z-index: 1;
	background: white;`

const imageElement = document.createElement("img");
imageElement.setAttribute('src','https://cdn.dribbble.com/users/2751207/screenshots/6346898/palm_anim_v2.gif')
imageElement.style=`position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;
	margin: auto;
	max-width: 100%;`		

loaderElement.appendChild(imageElement);
document.body.appendChild(loaderElement);
document.onreadystatechange = function () {
	if (document.readyState !== "complete") {
		document.querySelector("#loader").style.visibility = "visible";
	} else {
		document.querySelector("#loader").style.display = "none";
		try{
			afterLoader();
		}
		catch{}
	}
};

