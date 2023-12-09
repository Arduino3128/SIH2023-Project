const driver = window.driver.js.driver;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function getCookie(name) {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
	const [cookieName, cookieValue] = cookie.split('=');
	if (cookieName === name) {
	  return cookieValue;
	}
  }
  return null; // Cookie not found
}

async function closeSideNav(element, step, options) {
	closeNav();
	//await sleep(250);
	driverObj.movePrevious();
}

async function openSideNav(element, step, options) {
	openNav();
	await sleep(200);
	driverObj.movePrevious();
}

async function menuCloseSideNav(element, step, options) {
	closeNav();
	driverObj.moveNext();
}

async function menuOpenSideNav(element, step, options) {
	openNav();
	await sleep(200);
	driverObj.moveNext();
}

const driverObj = driver({
  showProgress: true,
  steps: [
	{ element: '#menu_btn', popover: { title: 'Menu', description: 'Access profile, register a device and log out of the account from here.', onNextClick: menuOpenSideNav} },
	{ element: 'a[href="/dashboard/profile"]', popover: { title: 'Profile', description: 'Access Profile from here.', onPrevClick: closeSideNav} },
	{ element: '#reg_dev_link', popover: { title: 'Register Device', description: 'Register Compute and Soil Probe Module from here.' } },
	{ element: 'a[href="/dashboard?showDemo=true"]', popover: { title: 'Show Demo', description: 'Access this demo again from here.' } },
	{ element: 'a[href="/logout"]', popover: { title: 'Log Out', description: 'Log out of the account from here.',onNextClick: menuCloseSideNav } },
	{ element: '.invalidElement', popover: { title: 'Done', description: 'You are all set!', onPrevClick: openSideNav } },
  ]
});


if (getCookie("showDemo")=="true"){	
	driverObj.drive();
	document.cookie = "showDemo=false";
}
