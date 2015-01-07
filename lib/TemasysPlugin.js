/**
 * Dependencies.
 */
var browser = require('bowser').browser;
var domready = require('domready');
var debug = require('debug')('rtcninja:TemasysPlugin');


/**
 * Local variables.
 */
var getUserMedia = null;
var RTCPeerConnection = null;
var RTCSessionDescription = null;
var RTCIceCandidate = null;
var MediaStreamTrack = null;
var attachMediaStream = null;
var browserVersion = Number(browser.version) || 0;

// The plugin HTML element.
var plugin = null;

// Plugin options. TODO: Make this configurable via API?
var pluginOptions = {
	getAllCams: false,
	hidePluginInstallPrompt: false
};

// Plugin information.
var pluginInfo = {
	prefix: 'Tem',
	plugName: 'TemWebRTCPlugin',
	pluginId: 'plugin0',
	type: 'application/x-temwebrtcplugin',
	onload: '__TemWebRTCReady0',
	portalLink: 'http://temasys.atlassian.net/wiki/display/TWPP/WebRTC+Plugins',
	downloadLink: null,
	companyName: 'Temasys'
};

if (!! navigator.platform.match(/^Mac/i)) {
	pluginInfo.downloadLink = 'http://bit.ly/1n77hco';
}
else if(!! navigator.platform.match(/^Win/i)) {
	pluginInfo.downloadLink = 'http://bit.ly/1kkS4FN';
}

// Unique identifier of each opened page.
var pageId = Math.random().toString(36).slice(2);

// Plugin possible states.
var PLUGIN_STATES = {
	NONE: 0,          // No plugin use.
	INITIALIZING: 1,  // Detected need for plugin.
	INJECTING: 2,     // Injecting plugin.
	INJECTED: 3,      // Plugin element injected but not usable yet.
	READY: 4          // Plugin ready to be used.
};

// Plugin current state.
var pluginState = PLUGIN_STATES.NONE;

/* jshint ignore:start */
global.__TemWebRTCReady0 = function() {
	debug('__TemWebRTCReady0()');

	arguments.callee.StaticWasInit = arguments.callee.StaticWasInit || 1;
	if (arguments.callee.StaticWasInit === 1) {
		domready(function() {
			pluginState = PLUGIN_STATES.READY;
		});
	}
	arguments.callee.StaticWasInit++;
}
/* jshint ignore:end */

function addEvent(elem, evnt, func) {
	// W3C DOM.
	if (elem.addEventListener) {
		elem.addEventListener(evnt, func, false);
	}
	// Old IE DOM.
	else if (elem.attachEvent) {
		elem.attachEvent('on' + evnt, func);
	}
}

function waitForPluginReady() {
	while (pluginState !== PLUGIN_STATES.READY) {}  // jshint ignore:line
}

function injectPlugin() {
	debug('injectPlugin()');

	pluginState = PLUGIN_STATES.INJECTING;

	// Internet Explorer <= 10.
	if (browser.msie && browserVersion <= 10) {
		var frag = document.createDocumentFragment();

		plugin = document.createElement('div');
		plugin.innerHTML = '<object id="' +
			pluginInfo.pluginId + '" type="' +
			pluginInfo.type + '" ' + 'width="1" height="1">' +
			'<param name="pluginId" value="' + pluginInfo.pluginId + '" />' +
			'<param name="windowless" value="false" />' +
			'<param name="pageId" value="' + pageId + '" />' +
			'<param name="onload" value="' + pluginInfo.onload + '" />' +
			(pluginOptions.getAllCams ? '<param name="forceGetAllCams" value="True" />' : '') +
			'</object>';

		while (plugin.firstChild) {
			frag.appendChild(plugin.firstChild);
		}
		document.body.appendChild(frag);

		// Need to re-fetch the plugin
		plugin = document.getElementById(pluginInfo.pluginId);
	}

	// Internet Explorer > 10 or Safari.
	else {
		plugin = document.createElement('object');
		plugin.id = pluginInfo.pluginId;
		// IE will only start the plugin if it's ACTUALLY visible.
		plugin.width = '1px';
		plugin.height = '1px';
		plugin.type = pluginInfo.type;
		plugin.innerHTML = '<param name="onload" value="' + pluginInfo.onload + '">' +
			'<param name="pluginId" value="' + pluginInfo.pluginId + '">' +
			'<param name="windowless" value="false" /> ' +
			(pluginOptions.getAllCams ? '<param name="forceGetAllCams" value="True" />' : '') +
			'<param name="pageId" value="' + pageId + '">';

		document.body.appendChild(plugin);
	}

	pluginState = PLUGIN_STATES.INJECTED;
}

function isPluginInstalled() {
	if (! browser.msie && navigator.plugins) {
		var pluginArray = navigator.plugins;

		for (var i=0, len=pluginArray.length; i<len; i++) {
			if (pluginArray[i].name.indexOf(pluginInfo.plugName) >= 0) {
				debug('isPluginInstalled() | yes');
				return true;
			}
		}
		debug('isPluginInstalled() | no');
		return false;
	}
	else {
		try {
			var axo = new global.ActiveXObject(pluginInfo.prefix + '.' + pluginInfo.plugName);  // jshint ignore:line
			debug('isPluginInstalled() | yes');
			return true;
		}
		catch(error) {
			debug('isPluginInstalled() | no');
			return false;
		}
	}
}

function defineWebRTCInterface() {
	debug('defineWebRTCInterface()');

	pluginState = PLUGIN_STATES.INITIALIZING;

	getUserMedia = function(constraints, successCallback, failureCallback) {
		waitForPluginReady();
		plugin.getUserMedia(constraints, successCallback, failureCallback);
	};

	// TODO: constraints.
	RTCPeerConnection = function(pcConfig, constraints) {
		var iceServers = pcConfig.iceServers;

		// The plugin requires a custom .hasCredentials boolean.
		for (var i=0, len=iceServers.length; i<len; i++) {
			iceServers[i].hasCredentials = iceServers[i].hasOwnProperty('username') && iceServers[i].hasOwnProperty('credential');
		}

		var mandatory = (constraints && constraints.mandatory) ? constraints.mandatory : null;
		var optional = (constraints && constraints.optional) ?
		constraints.optional : null;

		waitForPluginReady();
		return plugin.PeerConnection(pageId, iceServers, mandatory, optional);
	};

	RTCSessionDescription = function(data) {
		waitForPluginReady();
		return plugin.ConstructSessionDescription(data.type, data.sdp);
	};

	RTCIceCandidate = function(candidate) {
		waitForPluginReady();
		return plugin.ConstructIceCandidate(candidate.sdpMid || '', candidate.sdpMLineIndex, candidate.candidate);
	};

	MediaStreamTrack = function() {};
	MediaStreamTrack.getSources = function(callback) {
		waitForPluginReady();
		plugin.GetSources(callback);
	};

	attachMediaStream = function(element, stream) {
		stream.enableSoundTracks(true);

		if (element.nodeName.toLowerCase() !== 'audio') {
			var elementId = element.id.length === 0 ? Math.random().toString(36).slice(2) : element.id;

			if (! element.isWebRTCPlugin || !element.isWebRTCPlugin()) {
				var frag = document.createDocumentFragment();
				var temp = document.createElement('div');
				var classHTML = (element.className) ? 'class="' + element.className + '" ' : '';
				var rectObject = element.getBoundingClientRect();

				temp.innerHTML = '<object id="' + elementId + '" ' + classHTML +
					'type="' + pluginInfo.type + '">' +
					'<param name="pluginId" value="' + elementId + '" /> ' +
					'<param name="pageId" value="' + pageId + '" /> ' +
					'<param name="windowless" value="true" /> ' +
					'<param name="streamId" value="' + stream.id + '" /> ' +
					'</object>';
				while (temp.firstChild) {
					frag.appendChild(temp.firstChild);
				}
				element.parentNode.insertBefore(frag, element);
				frag = document.getElementById(elementId);
				frag.width = rectObject.width + 'px';
				frag.height = rectObject.height + 'px';
				element.parentNode.removeChild(element);
			}
			else {
				var children = element.children;
				for (var i=0, len=children.length; i !== len; i++) {
					if (children[i].name === 'streamId') {
						children[i].value = stream.id;
						break;
					}
				}
				element.setStreamId(stream.id);
			}

			var newElement = document.getElementById(elementId);
			newElement.onplaying = (element.onplaying) ? element.onplaying : function () {};

			// On IE the event needs to be plugged manually.
			if (browser.msie) {
				addEvent(newElement, 'playing', newElement.onplaying);
				newElement.onclick = (element.onclick) ? element.onclick : function() {};
				newElement._TemOnClick = function(id) {
					newElement.onclick({
						srcElement: document.getElementById(id)
					});
				};
			}

			return newElement;
		}

		else {
			return element;
		}
	};

	// Inject the plugin into the HTML.
	domready(function() {
		injectPlugin();
	});
}

// TODO: Temporal, must be a public API event.
function pluginNeededButNotInstalled() {
	debug('pluginNeededButNotInstalled()');

	if (pluginOptions.hidePluginInstallPrompt) { return; }

	domready(function() {
		var popupString;

		if (pluginInfo.portalLink) {
			popupString = 'This website requires you to install the <a href="' +
				pluginInfo.portalLink + '" target="_blank">' + pluginInfo.companyName +
				' WebRTC Plugin</a> to work on this browser.';
		}
		else {
			popupString = 'This website requires you to install a WebRTC-enabling plugin to work on this browser.';
		}

		renderNotificationBar(popupString, 'Install Now', pluginInfo.downloadLink);
	});
}

// TODO: temporal. It should be given to the user via an API event.
// function renderNotificationBar(text, buttonText, buttonLink) {
function renderNotificationBar(text) {
	global.alert(text);
}



/**
 * Expose the TemasysPlugin ... TODO
 */
var TemasysPlugin = module.exports = function() {
	var installed = isPluginInstalled();

	if (installed) {
		defineWebRTCInterface();
	}
	else {
		pluginNeededButNotInstalled();
	}

	TemasysPlugin.getUserMedia = getUserMedia;
	TemasysPlugin.RTCPeerConnection = RTCPeerConnection;
	TemasysPlugin.RTCSessionDescription = RTCSessionDescription;
	TemasysPlugin.RTCIceCandidate = RTCIceCandidate;
	TemasysPlugin.MediaStreamTrack = MediaStreamTrack;
	TemasysPlugin.attachMediaStream = attachMediaStream;

	return installed;
};
