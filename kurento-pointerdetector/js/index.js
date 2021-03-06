/*
* (C) Copyright 2014 Kurento (http://kurento.org/)
*
* All rights reserved. This program and the accompanying materials
* are made available under the terms of the GNU Lesser General Public License
* (LGPL) version 2.1 which accompanies this distribution, and is available at
* http://www.gnu.org/licenses/lgpl-2.1.html
*
* This library is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
* Lesser General Public License for more details.
*
*/

function getopts(args, opts)
{
  var result = opts.default || {};
  args.replace(
      new RegExp("([^?=&]+)(=([^&]*))?", "g"),
      function($0, $1, $2, $3) { result[$1] = $3; });

  return result;
};

var args = getopts(location.search,
{
  default:
  {
    ws_uri: 'ws://' + location.hostname + ':8888/kurento',
    ice_servers: undefined
  }
});

if (args.ice_servers) {
  console.log("Use ICE servers: " + args.ice_servers);
  kurentoUtils.WebRtcPeer.prototype.server.iceServers = JSON.parse(args.ice_servers);
} else {
  console.log("Use freeice")
}

var filter = null;
var pipeline;
var webRtcPeer

window.addEventListener("load", function(event)
{
	kurentoClient.register(kurentoModulePointerdetector)	
	console = new Console('console', console);

	var videoInput = document.getElementById('videoInput');
	var videoOutput = document.getElementById('videoOutput');

	var startButton = document.getElementById("start");
	var stopButton = document.getElementById("stop");
	stopButton.addEventListener("click", stop);

	startButton.addEventListener("click", function start()
	{
		console.log("WebRTC loopback starting");

		showSpinner(videoInput, videoOutput);

		webRtcPeer = kurentoUtils.WebRtcPeer.startSendRecv(videoInput, videoOutput,
		                                                   onOffer, onError);

		function onOffer(sdpOffer) {
			console.log("onOffer");

			kurentoClient(args.ws_uri, function(error, client) {
				if (error) return onError(error);

				client.create('MediaPipeline', function(error, p) {
					if (error) return onError(error);

					pipeline = p;

					console.log("Got MediaPipeline");

					pipeline.create('WebRtcEndpoint', function(error, webRtc) {
						if (error) return onError(error);

						console.log("Got WebRtcEndpoint");

            var options =
            {
              calibrationRegion:
              {
                topRightCornerX: 5,
                topRightCornerY:5,
                width:30,
                height: 30
              }
            };

						pipeline.create('PointerDetectorFilter', options,
						function(error, _filter) {
							if (error) return onError(error);

							filter = _filter;
							console.log("Connecting ...");

							webRtc.connect(filter, function(error) {
								if (error) return onError(error);

								console.log("WebRtcEndpoint --> filter");

								filter.connect(webRtc, function(error) {
									if (error) return onError(error);

									console.log("Filter --> WebRtcEndpoint");

                  var options =
                  {
                    id: 'window0',
                    height: 50,
                    width:50,
                    upperRightX: 500,
                    upperRightY: 150
                  };

									filter.addWindow(options, onError);

                  var options =
                  {
                    id: 'window1',
                    height: 50,
                    width:50,
                    upperRightX: 500,
                    upperRightY: 250
                  };

									filter.addWindow(options, onError);

									filter.on ('WindowIn', function (data){
										console.log ("Event window in detected in window " + data.windowId);
									});

									filter.on ('WindowOut', function (data){
										console.log ("Event window out detected in window " + data.windowId);
									});
								});
							});

							webRtc.processOffer(sdpOffer, function(error, sdpAnswer) {
								if (error) return onError(error);

								console.log("SDP answer obtained. Processing ...");

								webRtcPeer.processSdpAnswer(sdpAnswer);
							});
						});
					});
				});
			});
		}
	});
});

function calibrate() {
	if (filter != null) {
		filter.trackColorFromCalibrationRegion (function(error) {
			if (error) {
				return onError(error);
			}
		});
	}
}

function onError(error) {
	if(error) console.error(error);
}

function showSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].poster = 'img/transparent-1px.png';
		arguments[i].style.background = "center transparent url('img/spinner.gif') no-repeat";
	}
}

function hideSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].src = '';
		arguments[i].poster = 'img/webrtc.png';
		arguments[i].style.background = '';
	}
}

function stop(){
	if(pipeline){
		pipeline.release();
		pipeline = null;
	}

	if(webRtcPeer){
		webRtcPeer.dispose();
		webRtcPeer = null;
	}

	hideSpinner(videoInput, videoOutput);
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
	event.preventDefault();
	$(this).ekkoLightbox();
});
