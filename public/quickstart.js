window.callStarted = false;
window.audioZeroCount = 0;
window.sampleCount = 0;
window.eventLogsEnabled = true;

$(function () {
  var speakerDevices = document.getElementById('speaker-devices');
  var ringtoneDevices = document.getElementById('ringtone-devices');
  var outputVolumeBar = document.getElementById('output-volume');
  var inputVolumeBar = document.getElementById('input-volume');
  var volumeIndicators = document.getElementById('volume-indicators');

  var device;
  let onclick;

  log('Requesting Capability Token...');
  $.getJSON('CAPBILITY_TOKEN_URL')
    .then(function (data) {
      log('Got a token.');
      console.log('Token: ' + data.token);

      // Setup Twilio.Device
      device = new Twilio.Device(data.token, {debug: true, enableIceRestart: true});
      window.device = device;

      device.on('ready',function (device) {
        log('Twilio.Device Ready 3!');
        document.getElementById('call-controls').style.display = 'block';
        onclick();
      });

      device.on('error', function (error) {
        log('Twilio.Device Error: ' + error.message);
      });

      device.on('connect', function (conn) {
        log('Successfully established call!');
        document.getElementById('button-call').style.display = 'none';
        document.getElementById('button-hangup').style.display = 'inline';
        volumeIndicators.style.display = 'block';
        bindVolumeIndicators(conn);
        window.conn = conn;
        window.localStream = conn.getLocalStream();
        window.remoteStream = conn.getRemoteStream();
        window.callStarted = true;

        const logMessage = event => smt => {eventLogsEnabled && console.error(`Got event ${event}`, smt)}
        const listenFor = event => conn.on(event, logMessage(event));
        listenFor('cancel');
        listenFor('disconnect');
        listenFor('error');
        listenFor('mute');
        listenFor('reconnected');
        listenFor('reconnecting');
        listenFor('reject');
        listenFor('sample');
        listenFor('warning');
        listenFor('warning-cleared');

        conn.on('sample', data => {
          window.sampleCount += 1;
          if (data.audioInputLevel === 0) {
            window.audioZeroCount += 1;
          }
        });
      });

      device.on('disconnect', function (conn) {
        log('Call ended.');
        document.getElementById('button-call').style.display = 'inline';
        document.getElementById('button-hangup').style.display = 'none';
        volumeIndicators.style.display = 'none';
      });

      device.on('incoming', function (conn) {
        log('Incoming connection from ' + conn.parameters.From);
        var archEnemyPhoneNumber = '+12093373517';

        if (conn.parameters.From === archEnemyPhoneNumber) {
          conn.reject();
          log('It\'s your nemesis. Rejected call.');
        } else {
          // accept the incoming connection and start two-way audio
          conn.accept();
        }
      });

      setClientNameUI(data.identity);

      device.audio.on('deviceChange', updateAllDevices.bind(device));

      // Show audio selection UI if it is supported by the browser.
      if (device.audio.isOutputSelectionSupported) {
        document.getElementById('output-selection').style.display = 'block';
      }
    })
    .catch(function (err) {
      console.log(err);
      log('Could not get a token from server!');
    });

  // Bind button to make call
  onclick = function () {
    // get the phone number to connect the call to
    var params = {
    };

    console.log('Calling ' + params.To + '...');
    if (device) {
      var outgoingConnection = device.connect(params);
      outgoingConnection.on('ringing', function() {
        log('Ringing...');
      });
    }
  };

  // Bind button to hangup call
  document.getElementById('button-hangup').onclick = function () {
    log('Hanging up...');
    if (device) {
      device.disconnectAll();
    }
  };

  document.getElementById('get-devices').onclick = function() {
    console.error('get media')
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(updateAllDevices.bind(device));
  }

  speakerDevices.addEventListener('change', function() {
    var selectedDevices = [].slice.call(speakerDevices.children)
      .filter(function(node) { return node.selected; })
      .map(function(node) { return node.getAttribute('data-id'); });

    device.audio.speakerDevices.set(selectedDevices);
  });

  ringtoneDevices.addEventListener('change', function() {
    var selectedDevices = [].slice.call(ringtoneDevices.children)
      .filter(function(node) { return node.selected; })
      .map(function(node) { return node.getAttribute('data-id'); });

    device.audio.ringtoneDevices.set(selectedDevices);
  });

  function bindVolumeIndicators(connection) {
    connection.on('volume', function(inputVolume, outputVolume) {
      var inputColor = 'red';
      if (inputVolume < .50) {
        inputColor = 'green';
      } else if (inputVolume < .75) {
        inputColor = 'yellow';
      }

      inputVolumeBar.style.width = Math.floor(inputVolume * 300) + 'px';
      inputVolumeBar.style.background = inputColor;

      var outputColor = 'red';
      if (outputVolume < .50) {
        outputColor = 'green';
      } else if (outputVolume < .75) {
        outputColor = 'yellow';
      }

      outputVolumeBar.style.width = Math.floor(outputVolume * 300) + 'px';
      outputVolumeBar.style.background = outputColor;
    });
  }

  function updateAllDevices() {
    updateDevices(speakerDevices, device.audio.speakerDevices.get());
    updateDevices(ringtoneDevices, device.audio.ringtoneDevices.get());


    // updateDevices(speakerDevices, );
    // updateDevices(ringtoneDevices, device);
  }

  // Update the available ringtone and speaker devices
  function updateDevices(selectEl, selectedDevices) {
    selectEl.innerHTML = '';

    device.audio.availableOutputDevices.forEach(function(device, id) {
      var isActive = (selectedDevices.size === 0 && id === 'default');
      selectedDevices.forEach(function(device) {
        if (device.deviceId === id) { isActive = true; }
      });

      var option = document.createElement('option');
      option.label = device.label;
      option.setAttribute('data-id', id);
      if (isActive) {
        option.setAttribute('selected', 'selected');
      }
      selectEl.appendChild(option);
    });
  }

  // Activity log
  function log(message) {
    var logDiv = document.getElementById('log');
    logDiv.innerHTML += '<p>&gt;&nbsp;' + message + '</p>';
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  // Set the client name in the UI
  function setClientNameUI(clientName) {
    var div = document.getElementById('client-name');
    div.innerHTML = 'Your client name: <strong>' + clientName +
      '</strong>';
  }
});
