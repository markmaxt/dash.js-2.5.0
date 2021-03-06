document.write("<script language=javascript src='app/user_config.js'></script>");

'use strict';

var app = angular.module('DashPlayer', ['DashSourcesService', 'DashContributorsService', 'angular-flot']);

$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip();
    $('#drmLicenseForm').hide();
});

angular.module('DashSourcesService', ['ngResource']).factory('sources', function($resource){
    return $resource('app/sources.json', {}, {
        query: {method:'GET', isArray:false}
    });
});

angular.module('DashContributorsService', ['ngResource']).factory('contributors', function($resource){
    return $resource('app/contributors.json', {}, {
        query: {method:'GET', isArray:false}
    });
});

app.controller('DashController', function($scope, sources, contributors) {


    $scope.selectedItem = {url:'http://219.223.189.146:8000/Nicebody/stream.mpd'};

    sources.query(function (data) {
        $scope.availableStreams = data.items;
        //if no mss package, remove mss samples.
        let MssHandler = dashjs.MssHandler; /* jshint ignore:line */
        if (typeof MssHandler !== 'function')
        {
            for(var i = $scope.availableStreams.length - 1; i >= 0; i--){
                if($scope.availableStreams[i].name === 'Smooth Streaming'){
                    $scope.availableStreams.splice(i,1);
                }
            }
        }
    });

    contributors.query(function (data) {
        $scope.contributors = data.items;
    });

    $scope.chartOptions = {
        legend: {
            labelBoxBorderColor: '#ffffff',
            placement: 'outsideGrid',
            container: '#legend-wrapper',
            labelFormatter: function(label, series) {
                return '<div  style="cursor: pointer;" id="'+ series.type + '.' + series.id +'" onclick="legendLabelClickHandler(this)">'+ label +'</div>';
            }
        },
        series: {
            lines: {
                show: true,
                lineWidth: 2,
                shadowSize: 1,
                steps: false,
                fill: false,
            },
            points: {
                radius: 4,
                fill: true,
                show: true
            }
        },
        grid:{
            clickable: false,
            hoverable: false,
            autoHighlight:true,
            color:'#136bfb',
            backgroundColor:'#ffffff'
        },
        axisLabels: {
            position: 'left'
        },
        xaxis: {
            tickFormatter: function tickFormatter(value) {
                return $scope.player.convertToTimeCode(value);
            },
            tickDecimals: 0,
            color: '#136bfb',
            alignTicksWithAxis:1
        },
        yaxis: {
            min:0,
            tickLength:0,
            tickDecimals: 0,
            color: '#136bfb',
            position: 'right',
            axisLabelPadding: 20,
        },
        yaxes: []
    };

    $scope.chartEnabled = true;
    $scope.maxPointsToChart = 30;
    $scope.maxChartableItems = 5;
    $scope.chartCount = 0;
    $scope.chartData = [];

    $scope.chartState = {
        audio:{
            buffer:         {data: [], selected: false, color: '#65080c', label: 'Audio Buffer Level'},
            bitrate:        {data: [], selected: false, color: '#00CCBE', label: 'Audio Bitrate (kbps)'},
            index:          {data: [], selected: false, color: '#ffd446', label: 'Audio Current Index'},
            pendingIndex:   {data: [], selected: false, color: '#FF6700', label: 'AudioPending Index'},
            ratio:          {data: [], selected: false, color: '#329d61', label: 'Audio Ratio'},
            download:       {data: [], selected: false, color: '#44c248', label: 'Audio Download Rate (Mbps)'},
            latency:        {data: [], selected: false, color: '#326e88', label: 'Audio Latency (ms)'},
            droppedFPS:     {data: [], selected: false, color: '#004E64', label: 'Audio Dropped FPS'}
        },
        video:{
            buffer:         {data: [], selected: true, color: '#00589d', label: 'Video Buffer Level'},
            bitrate:        {data: [], selected: true, color: '#ff7900', label: 'Video Bitrate (kbps)'},
            index:          {data: [], selected: false, color: '#326e88', label: 'Video Current Quality'},
            pendingIndex:   {data: [], selected: false, color: '#44c248', label: 'Video Pending Index'},
            ratio:          {data: [], selected: false, color: '#00CCBE', label: 'Video Ratio'},
            download:       {data: [], selected: false, color: '#FF6700', label: 'Video Download Rate (Mbps)'},
            latency:        {data: [], selected: false, color: '#329d61', label: 'Video Latency (ms)'},
            droppedFPS:     {data: [], selected: false, color: '#65080c', label: 'Video Dropped FPS'}
        }
    };

    $scope.abrEnabled = true;
    $scope.toggleCCBubble = false;
    $scope.debugEnabled = false;
    $scope.htmlLogging = false;
    $scope.videotoggle = false;
    $scope.audiotoggle = false;
    $scope.optionsGutter = true;
    $scope.drmData = [];
    $scope.initialSettings = {audio: null, video: null};
    $scope.mediaSettingsCacheEnabled = true;
    $scope.metricsTimer = null;
    $scope.updateMetricsInterval = 1000;
    $scope.drmKeySystems = ['com.widevine.alpha', 'com.microsoft.playready'];
    $scope.drmKeySystem = "";
    $scope.drmLicenseURL = "";

    //metrics
    $scope.videoBitrate = 0;
    $scope.videoIndex = 0;
    $scope.videoPendingIndex = 0;
    $scope.videoMaxIndex = 0;
    $scope.videoBufferLength = 0;
    $scope.videoDroppedFrames = 0;
    $scope.videoLatencyCount = 0;
    $scope.videoLatency = "";
    $scope.videoDownloadCount = 0;
    $scope.videoDownload = "";
    $scope.videoRatioCount = 0;
    $scope.videoRatio = "";

    $scope.audioBitrate = 0;
    $scope.audioIndex = 0;
    $scope.audioPendingIndex = "";
    $scope.audioMaxIndex = 0;
    $scope.audioBufferLength = 0;
    $scope.audioDroppedFrames = 0;
    $scope.audioLatencyCount = 0;
    $scope.audioLatency = "";
    $scope.audioDownloadCount = 0;
    $scope.audioDownload = "";
    $scope.audioRatioCount = 0;
    $scope.audioRatio = "";


    //Starting Options
    $scope.autoPlaySelected = true;
    $scope.loopSelected = true;
    $scope.scheduleWhilePausedSelected = true;
    $scope.localStorageSelected = true;
    $scope.fastSwitchSelected = false;
    $scope.bolaSelected = false;

    // (nyhuang) For custom ABR experiments.
    $scope.useCustomABR = false;
    $scope.useBola = false;
    $scope.useRateBased = false;
    $scope.useElastic = false;
    $scope.useBBA = false;
    $scope.useGTA = false;
    // (xtma) For custom ABR experiments.
    $scope.useEdgeGuide = false;


    ////////////////////////////////////////
    //
    // Player Setup
    //
    ////////////////////////////////////////

    $scope.video = document.querySelector(".dash-video-player video");
    $scope.player = dashjs.MediaPlayer().create();
    $scope.player.initialize($scope.video, null, $scope.autoPlaySelected);
    $scope.player.setFastSwitchEnabled(false);
    $scope.player.attachVideoContainer(document.getElementById("videoContainer"));

    let dash_metrics = $scope.player.getDashMetrics();
    var client_id_idx = user_config.keys.indexOf("client_id");
    $scope.player.setMetricsClientId('video', user_config.values[client_id_idx]);
    // ----------------------------Added to upload the form data-------------------------------------
    $scope.player.epoch_count = 0;
    $scope.player.http_req_no = 0;
    $scope.player.send_csv_to_server = function(chunk_csv_string, time_csv_string) {
        let request = new XMLHttpRequest();
        let data = new FormData();
        if (user_config.keys.length == user_config.values.length) {
            for (let i = 0; i < user_config.keys.length; ++i) {
                data.append(user_config.keys[i], user_config.values[i]);
            }
        }
        data.append("no", $scope.player.http_req_no++);
        data.append("chunk", chunk_csv_string);
        data.append("time", time_csv_string);
        request.open("POST", "http://219.223.189.146:8000/handleFile/", true);
        request.send(data);
    };
    let time_csv_data = [[
        "epoch_count",
        "timestamp",
        "current_buffer"
    ]];
    let time_poller = setInterval(function () {
        let dash_metrics = $scope.player.getDashMetrics();
        if ($scope.player.getActiveStream() && dash_metrics) {
                    let metrics = $scope.player.getMetricsFor('video');
                    let row = [
                        $scope.player.epoch_count,
                        new Date().getTime(),
                        dash_metrics.getCurrentBufferLevel(metrics)
                    ];
                    time_csv_data.push(row);
            }
    }, 50);

    let stop = false;

    setTimeout(function() {
        console.log("Experiment timeout");
        stop = true;
    }, parseInt(user_config.exp_time) * 60 * 1000);
    // ----------------------------------------------------------------------------------------------

    // Add HTML-rendered TTML subtitles except for Firefox < v49 (issue #1164)
    if (doesTimeMarchesOn()) {
        $scope.player.attachTTMLRenderingDiv($("#video-caption")[0]);
    }

    $scope.controlbar = new ControlBar($scope.player);
    $scope.controlbar.initialize();
    $scope.controlbar.disable();
    $scope.version = $scope.player.getVersion();

    $scope.player.on(dashjs.MediaPlayer.events.ERROR, function (e) { console.error(e.error + ' : ' + e.event.message);}, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_REQUESTED, function (e) {
        $scope[e.mediaType + "Index"] = e.oldQuality + 1 ;
        $scope[e.mediaType+ "PendingIndex"] = e.newQuality + 1;
        $scope.plotPoint('pendingIndex', e.mediaType, e.newQuality + 1);

    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, function (e) {
        $scope[e.mediaType + "Index"] = e.newQuality + 1;
        $scope[e.mediaType + "PendingIndex"] = e.newQuality + 1;
        $scope.plotPoint('index', e.mediaType, e.newQuality + 1);
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, function (e) {
        $scope.streamInfo = e.toStreamInfo;
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, function (e) {
        clearInterval($scope.metricsTimer);
        $scope.chartCount = 0;
        $scope.metricsTimer = setInterval(function () {
            updateMetrics("video");
            updateMetrics("audio");
            $scope.chartCount++;
        }, $scope.updateMetricsInterval)
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, function(e) {
        // -----------------Added to upload form data-------------------------------
        let chunk_csv_data = [[
            "epoch_count", "start_timestamp", "finish_timestamp", "video_name",
                "chunk_download_time", "chunk_no", "track"
                    ]],
            http_requests = $scope.player.getDashMetrics().getHttpRequests($scope.player.getMetricsFor('video'));
        for (let i = 0; i < http_requests.length; ++i) {
            let request = http_requests[i];
            if (request.type != "MediaSegment") {
                // The "MediaSegment" is also the HTTPRequest.MEDIA_SEGMENT_TYPE
                continue;
            }
            let splitted = request.url.split('/'),
                chunk_name = splitted[splitted.length-1];
            let row = [
                $scope.player.epoch_count,
                request.trequest.getTime(),
                request.trequest.getTime() + request.interval,
                user_config.video_names[$scope.player.video_idx],
                request.interval,
                chunk_name.match(/\d+/g)[0],
                splitted[splitted.length - 2]
            ];
            chunk_csv_data.push(row);
        };
        let chunk_csv_string = chunk_csv_data.map(e => e.join(',')).join('\n');
        let time_csv_string = time_csv_data.map(e => e.join(',')).join('\n');
        time_csv_data = [[
            "epoch_count",
            "timestamp",
            "current_buffer"
        ]];
        $scope.player.send_csv_to_server(chunk_csv_string, time_csv_string);
        // --------------------------------------------------------------------------------

        // Add the "stop" to justify whether we should load a new video
        if ($('#loop-cb').is(':checked') &&
            $scope.player.getActiveStream().getStreamInfo().isLast) {
            ++$scope.player.epoch_count;
            $scope.doLoad();
        } else if (!stop) {
            ++$scope.player.epoch_count;
            $scope.doLoad();
        } else {
            clearInterval(time_poller);
            $scope.player.reset();
            console.log("Experiment ends at", new Date().getTime());
        }
    }, $scope);

    ////////////////////////////////////////
    //
    // DRM Events  //
    //
    // TODO Implement what is in eme-main and eme-index into this $scope.player to unify.  Add dialog in tab section for DRM license info.  Reinstate the DRM Options panel
    //
    ////////////////////////////////////////

    // Listen for protection system creation/destruction by the $scope.player itself.  This will
    // only happen in the case where we do not not provide a ProtectionController
    // to the $scope.player via dashjs.MediaPlayer.attachSource()

    //$scope.player.on(dashjs.MediaPlayer.events.PROTECTION_CREATED, function (e) {
    //    var data = addDRMData(e.manifest, e.controller);
    //    data.isPlaying = true;
    //    for (var i = 0; i < $scope.drmData.length; i++) {
    //        if ($scope.drmData[i] !== data) {
    //            $scope.drmData[i].isPlaying = false;
    //        }
    //    }
    //    $scope.safeApply();
    //}, $scope);
    //
    //$scope.player.on(dashjs.MediaPlayer.events.PROTECTION_DESTROYED, function (e) {
    //    for (var i = 0; i < $scope.drmData.length; i++) {
    //        if ($scope.drmData[i].manifest.url === e.data) {
    //            $scope.drmData.splice(i, 1);
    //            break;
    //        }
    //    }
    //    $scope.safeApply();
    //}, $scope);


    //var addDRMData = function(manifest, protCtrl) {
    //
    //    // Assign the session type to be used for this controller
    //    protCtrl.setSessionType($("#session-type").find(".active").children().attr("id"));
    //
    //    var data = {
    //        manifest: manifest,
    //        protCtrl: protCtrl,
    //        licenseReceived: false,
    //        sessions: []
    //    };
    //    var findSession = function(sessionID) {
    //        for (var i = 0; i < data.sessions.length; i++) {
    //            if (data.sessions[i].sessionID === sessionID)
    //                return data.sessions[i];
    //        }
    //        return null;
    //    };
    //    $scope.drmData.push(data);
    //    $scope.safeApply();
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_SYSTEM_SELECTED, function(e) {
    //        if (!e.error) {
    //            data.ksconfig = e.data.ksConfiguration;
    //        } else {
    //            data.error = e.error;
    //        }
    //        $scope.safeApply();
    //    }, $scope);
    //
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_SESSION_CREATED, function(e) {
    //        if (!e.error) {
    //            var persistedSession = findSession(e.data.getSessionID());
    //            if (persistedSession) {
    //                persistedSession.isLoaded = true;
    //                persistedSession.sessionToken = e.data;
    //            } else {
    //                var sessionToken = e.data;
    //                data.sessions.push({
    //                    sessionToken: sessionToken,
    //                    sessionID: e.data.getSessionID(),
    //                    isLoaded: true
    //                });
    //            }
    //        } else {
    //            data.error = e.error;
    //        }
    //        $scope.safeApply();
    //    }, $scope);
    //
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_SESSION_REMOVED, function(e) {
    //        if (!e.error) {
    //            var session = findSession(e.data);
    //            if (session) {
    //                session.isLoaded = false;
    //                session.sessionToken = null;
    //            }
    //        } else {
    //            data.error = e.error;
    //        }
    //        $scope.safeApply();
    //    }, $scope);
    //
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_SESSION_CLOSED, function(e) {
    //        if (!e.error) {
    //            for (var i = 0; i < data.sessions.length; i++) {
    //                if (data.sessions[i].sessionID === e.data) {
    //                    data.sessions.splice(i, 1);
    //                    break;
    //                }
    //            }
    //        } else {
    //            data.error = e.error;
    //        }
    //        $scope.safeApply();
    //    }, $scope);
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_STATUSES_CHANGED, function(e) {
    //        var session = findSession(e.data.getSessionID());
    //        if (session) {
    //            var toGUID = function(uakey) {
    //                var keyIdx = 0, retVal = "", i, zeroPad = function(str) {
    //                    return (str.length === 1) ? "0" + str : str;
    //                };
    //                for (i = 0; i < 4; i++, keyIdx++)
    //                    retVal += zeroPad(uakey[keyIdx].toString(16));
    //                retVal += "-";
    //                for (i = 0; i < 2; i++, keyIdx++)
    //                    retVal += zeroPad(uakey[keyIdx].toString(16));
    //                retVal += "-";
    //                for (i = 0; i < 2; i++, keyIdx++)
    //                    retVal += zeroPad(uakey[keyIdx].toString(16));
    //                retVal += "-";
    //                for (i = 0; i < 2; i++, keyIdx++)
    //                    retVal += zeroPad(uakey[keyIdx].toString(16));
    //                retVal += "-";
    //                for (i = 0; i < 6; i++, keyIdx++)
    //                    retVal += zeroPad(uakey[keyIdx].toString(16));
    //                return retVal;
    //            };
    //            session.keystatus = [];
    //            e.data.getKeyStatuses().forEach(function(status, key){
    //                session.keystatus.push({
    //                    key: toGUID(new Uint8Array(key)),
    //                    status: status
    //                });
    //            });
    //            $scope.safeApply();
    //        }
    //    }, $scope);
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_MESSAGE, function(e) {
    //        var session = findSession(e.data.sessionToken.getSessionID());
    //        if (session) {
    //            session.lastMessage = "Last Message: " + e.data.message.byteLength + " bytes";
    //            if (e.data.messageType) {
    //                session.lastMessage += " (" + e.data.messageType + "). ";
    //            } else {
    //                session.lastMessage += ". ";
    //            }
    //            session.lastMessage += "Waiting for response from license server...";
    //            $scope.safeApply();
    //        }
    //    }, $scope);
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.LICENSE_REQUEST_COMPLETE, function(e) {
    //        if (!e.error) {
    //            var session = findSession(e.data.sessionToken.getSessionID());
    //            if (session) {
    //                session.lastMessage = "Successful response received from license server for message type '" + e.data.messageType + "'!";
    //                data.licenseReceived = true;
    //            }
    //        } else {
    //            data.error = "License request failed for message type '" + e.data.messageType + "'! " + e.error;
    //        }
    //        $scope.safeApply();
    //    }, $scope);
    //
    //    return data;
    //};
    //
    //$scope.delete = function(data) {
    //    for (var i = 0; i < $scope.drmData.length; i++) {
    //        if ($scope.drmData[i] === data) {
    //            $scope.drmData.splice(i,1);
    //            data.protCtrl.reset();
    //            $scope.safeApply();
    //        }
    //    }
    //};

    //$scope.play = function (data) {
    //    $scope.player.attachSource(data.manifest, data.protCtrl);
    //    for (var i = 0; i < $scope.drmData.length; i++) {
    //        var drmData = $scope.drmData[i];
    //        drmData.isPlaying = !!(drmData === data);
    //    }
    //};

    //$scope.doLicenseFetch = function () {
    //    $scope.player.retrieveManifest($scope.selectedItem.url, function (manifest) {
    //        if (manifest) {
    //            var found = false;
    //            for (var i = 0; i < $scope.drmData.length; i++) {
    //                if (manifest.url === $scope.drmData[i].manifest.url) {
    //                    found = true;
    //                    break;
    //                }
    //            }
    //            if (!found) {
    //                var protCtrl = $scope.player.getProtectionController();
    //                if ($scope.selectedItem.hasOwnProperty("protData")) {
    //                    protCtrl.setProtectionData($scope.selectedItem.protData);
    //                }
    //                addDRMData(manifest, protCtrl);
    //                protCtrl.initialize(manifest);
    //            }
    //        } else {
    //            // Log error here
    //        }
    //    });
    //};

    ////////////////////////////////////////
    //
    // General Player Methods
    //
    ////////////////////////////////////////

    $scope.onChartEnableButtonClick = function () {
        $scope.chartEnabled = !$scope.chartEnabled;
        $('#chart-wrapper').fadeTo(500, $scope.chartEnabled ? 1 : .3);
    };

    $scope.toggleAutoPlay = function () {
        $scope.player.setAutoPlay($scope.autoPlaySelected);
    };

    $scope.toggleBufferOccupancyABR = function () {
        $scope.player.enableBufferOccupancyABR($scope.bolaSelected);
    };

    // (nyhuang) For custom ABR experiments.
    $scope.toggleUseCustomABR = function () {
        $scope.player.setUseCustomABR($scope.useCustomABR);
    };

    $scope.toggleUseBola = function () {
        $scope.player.setUseBola($scope.useBola);
    };

    $scope.toggleUseRateBased = function () {
        $scope.player.setUseRateBased($scope.useRateBased);
    };

    $scope.toggleUseElastic = function () {
        $scope.player.setUseElastic($scope.useElastic);
    };

    $scope.toggleUseBBA = function () {
        $scope.player.setUseBBA($scope.useBBA);
    };

    $scope.toggleUseGTA = function () {
        $scope.player.setUseGTA($scope.useGTA);
    };

    // (xtma) For custom ABR experiment
    $scope.toggleUseEdgeGuide = function () {
        $scope.player.setUseEdgeGuide($scope.useEdgeGuide);
    };

    $scope.debug = function() {

    }

    $scope.toggleFastSwitch = function () {
        $scope.player.setFastSwitchEnabled($scope.fastSwitchSelected);
    };

    $scope.toggleScheduleWhilePaused = function () {
        $scope.player.setScheduleWhilePaused($scope.scheduleWhilePausedSelected);
    };

    $scope.toggleLocalStorage = function () {
        $scope.player.enableLastBitrateCaching($scope.localStorageSelected);
        $scope.player.enableLastMediaSettingsCaching($scope.localStorageSelected);
    };

    $scope.setStream = function (item) {
        $scope.selectedItem = JSON.parse(JSON.stringify(item));
    };

    $scope.toggleOptionsGutter = function (bool) {
        $scope.optionsGutter = bool;
    };

    $scope.doLoad = function () {

        $scope.initSession();

        var protData = {};
        if ($scope.selectedItem.hasOwnProperty("protData")) {
            protData = $scope.selectedItem.protData;
        } else if ($scope.drmLicenseURL !== "" && $scope.drmKeySystem !== "") {
            protData[$scope.drmKeySystem] = {serverURL:$scope.drmLicenseURL};
        } else {
            protData = null;
        }

        $scope.controlbar.reset();
        $scope.player.setProtectionData(protData);

        // Renew the url
        let video_names = user_config.video_names;
        var client_id_idx = user_config.keys.indexOf("client_id");
        $scope.player.video_idx = parseInt(Math.random() * video_names.length);
        let video_name = video_names[$scope.player.video_idx];
        if ($scope.player.video_idx ===  video_names.length || typeof video_name === "undefined") {
            video_name = 'Nicebody';
        }
        console.log('The request video is ' + video_name +' , the client is ' + user_config.values[client_id_idx]);
        let url = 'http://219.223.189.146:8000/'+ video_name + '/stream.mpd';
        $scope.selectedItem = {url:url};

        $scope.player.attachSource($scope.selectedItem.url);
        $scope.player.setMetricsClientId('video', user_config.values[client_id_idx]);
        if ($scope.initialSettings.audio) {
            $scope.player.setInitialMediaSettingsFor("audio", {lang: $scope.initialSettings.audio});
        }
        if ($scope.initialSettings.video) {
            $scope.player.setInitialMediaSettingsFor("video", {role: $scope.initialSettings.video});
        }
        $scope.controlbar.enable();
    };

    $scope.changeTrackSwitchMode = function(mode, type) {
        $scope.player.setTrackSwitchModeFor(type, mode);
    };

    $scope.hasLogo = function (item) {
        return (item.hasOwnProperty("logo") && item.logo !== null && item.logo !== undefined && item.logo !== "");
    };

    $scope.getChartButtonLabel = function () {
        return $scope.chartEnabled ? "Disable" : "Enable";
    };

    $scope.getOptionsButtonLabel = function () {
        return $scope.optionsGutter ? "Hide Options" : "Show Options";
    };

    $scope.setDrmKeySystem = function(item) {
        $scope.drmKeySystem = item;
        $('#drmLicenseForm').show();
    };

    // from: https://gist.github.com/siongui/4969449
    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest')
            this.$eval(fn);
        else
            this.$apply(fn);
    };

    ////////////////////////////////////////
    //
    // Metrics
    //
    ////////////////////////////////////////
    $scope.initSession = function () {
        $scope.clearChartData();
        $scope.sessionStartTime = new Date().getTime() / 1000;
    };

    function calculateHTTPMetrics(type, requests) {

        var latency = {},
            download = {},
            ratio = {};

        var requestWindow = requests.slice(-20).filter(function (req) {
            return req.responsecode >= 200 && req.responsecode < 300 && req.type === "MediaSegment" && req._stream === type && !!req._mediaduration;
        }).slice(-4);

        if (requestWindow.length > 0) {

            var latencyTimes = requestWindow.map(function (req){ return Math.abs(req.tresponse.getTime() - req.trequest.getTime()) / 1000;});

            latency[type] = {
                average: latencyTimes.reduce(function(l, r) {return l + r;}) / latencyTimes.length,
                high: latencyTimes.reduce(function(l, r) {return l < r ? r : l;}),
                low: latencyTimes.reduce(function(l, r) {return l < r ? l : r;}),
                count: latencyTimes.length
            };

            var downloadTimes = requestWindow.map(function (req){return Math.abs(req._tfinish.getTime() - req.tresponse.getTime()) / 1000;});

            download[type] = {
                average: downloadTimes.reduce(function(l, r) {return l + r;}) / downloadTimes.length,
                high: downloadTimes.reduce(function(l, r) {return l < r ? r : l;}),
                low: downloadTimes.reduce(function(l, r) {return l < r ? l : r;}),
                count: downloadTimes.length
            };

            var durationTimes = requestWindow.map(function (req){ return req._mediaduration;});

            ratio[type] = {
                average: (durationTimes.reduce(function(l, r) {return l + r;}) / downloadTimes.length) / download[type].average,
                high: durationTimes.reduce(function(l, r) {return l < r ? r : l;}) / download[type].low,
                low: durationTimes.reduce(function(l, r) {return l < r ? l : r;}) / download[type].high,
                count: durationTimes.length
            };

            return {latency: latency, download: download, ratio: ratio};

        }
        return null;
    }

    $scope.clearChartData = function () {
        for (var key in $scope.chartState) {
            for (var i in $scope.chartState[key]) {
                $scope.chartState[key][i].data.length = 0;
            }
        }
    };

    $scope.plotPoint = function(name, type, value) {
        if ($scope.chartEnabled) {
            var specificChart = $scope.chartState[type];
            if (specificChart) {
                var data = specificChart[name].data;
                data.push([$scope.video.currentTime, value]);
                if (data.length > $scope.maxPointsToChart) {
                    data.splice(0, 1);
                }
            }
        }
        $scope.safeApply();
    };

    $scope.enableChartByName = function (id, type) {
        //enable stat item
        if ($scope.chartState[type][id].selected) {

            //block stat item if too many already.
            if ($scope.chartData.length === $scope.maxChartableItems) {
                alert("You have selected too many items to chart simultaneously. Max allowd is "+ $scope.maxChartableItems+". Please unselect another item first, then reselected " + $scope.chartState[type][id].label);
                $scope.chartState[type][id].selected = false;
                return;
            }

            var data = {
                id: id,
                data: $scope.chartState[type][id].data,
                label: $scope.chartState[type][id].label,
                color: $scope.chartState[type][id].color,
                yaxis: $scope.chartData.length + 1,
                type: type
            };
            $scope.chartData.push(data);
            $scope.chartOptions.yaxes.push({axisLabel: data.label});
        } else { //remove stat item from charts
            for (var i = 0; i < $scope.chartData.length; i++) {
                if ($scope.chartData[i].id === id && $scope.chartData[i].type === type) {
                    $scope.chartData.splice(i, 1);
                    $scope.chartOptions.yaxes.splice(i, 1);
                }
                if ($scope.chartData.length > i) {
                    $scope.chartData[i].yaxis = i + 1;
                }
            }
        }

        $scope.chartOptions.legend.noColumns = Math.min($scope.chartData.length, 5);
    };

    function updateMetrics(type) {

        var metrics = $scope.player.getMetricsFor(type);
        var dashMetrics = $scope.player.getDashMetrics();

        if (metrics && dashMetrics && $scope.streamInfo) {

            var periodIdx = $scope.streamInfo.index;
            var repSwitch = dashMetrics.getCurrentRepresentationSwitch(metrics);
            var bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
            var maxIndex = dashMetrics.getMaxIndexForBufferType(type, periodIdx);
            var index = $scope.player.getQualityFor(type);
            var bitrate = repSwitch ? Math.round(dashMetrics.getBandwidthForRepresentation(repSwitch.to, periodIdx) / 1000) : NaN;
            var droppedFPS = dashMetrics.getCurrentDroppedFrames(metrics) ? dashMetrics.getCurrentDroppedFrames(metrics).droppedFrames : 0;

            $scope[type + "BufferLength"] = bufferLevel;
            $scope[type + "MaxIndex"] = maxIndex;
            $scope[type + "Bitrate"] = bitrate;
            $scope[type + "DroppedFrames"] = droppedFPS;

            var httpMetrics = calculateHTTPMetrics(type, dashMetrics.getHttpRequests(metrics));
            if (httpMetrics) {
                $scope[type + "Download"] = httpMetrics.download[type].low.toFixed(2) + " | " + httpMetrics.download[type].average.toFixed(2) + " | " + httpMetrics.download[type].high.toFixed(2);
                $scope[type + "Latency"] = httpMetrics.latency[type].low.toFixed(2) + " | " + httpMetrics.latency[type].average.toFixed(2) + " | " + httpMetrics.latency[type].high.toFixed(2);
                $scope[type + "Ratio"] = httpMetrics.ratio[type].low.toFixed(2) + " | " + httpMetrics.ratio[type].average.toFixed(2) + " | " + httpMetrics.ratio[type].high.toFixed(2);
            }

            if ($scope.chartCount % 2 === 0) {
                $scope.plotPoint('buffer', type, bufferLevel);
                $scope.plotPoint('index', type, index);
                $scope.plotPoint('bitrate', type, bitrate);
                $scope.plotPoint('droppedFPS', type, droppedFPS);
                if (httpMetrics) {
                    $scope.plotPoint('download', type, httpMetrics.download[type].average.toFixed(2));
                    $scope.plotPoint('latency', type, httpMetrics.latency[type].average.toFixed(2));
                    $scope.plotPoint('ratio', type, httpMetrics.ratio[type].average.toFixed(2));
                }
            }
        }
    }

     $scope.initChartingByMediaType = function(type) {
        var arr = $scope.chartState[type];
        for (var key in arr) {
            var obj = arr[key];
            if (obj.selected) {
                $scope.enableChartByName(key, type);
            }
        }
    };


    ////////////////////////////////////////
    //
    // Init
    //
    ////////////////////////////////////////

    function doesTimeMarchesOn() {
        var version;
        var REQUIRED_VERSION = 49.0;

        if (typeof navigator !== 'undefined') {
            if (!navigator.userAgent.match(/Firefox/)) {
                return true;
            }

            version = parseFloat(navigator.userAgent.match(/rv:([0-9.]+)/)[1]);

            if (!isNaN(version) && version >= REQUIRED_VERSION){
                return true;
            }
        }
    }


    (function init() {

        $scope.initChartingByMediaType("video");
        $scope.initChartingByMediaType("audio");


        function getUrlVars() {
            var vars = {};
            var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
                vars[key] = value;
            });
            return vars;
        }

        var vars = getUrlVars();
        var item = {};

        if (vars && vars.hasOwnProperty("url")) {
            item.url = vars.url;
        }

        if (vars && vars.hasOwnProperty("mpd")) {
            item.url = vars.mpd;
        }

        if (vars && vars.hasOwnProperty("source")) {
            item.url = vars.source;
        }

        if (vars && vars.hasOwnProperty("stream")) {
            try {
                item = JSON.parse(atob(vars.stream));
            } catch (e) {}
        }

        if (item.url) {
            var startPlayback = false;

            $scope.selectedItem = item;

            if (vars.hasOwnProperty("autoplay")) {
                startPlayback = (vars.autoplay === 'true');
            }

            if (startPlayback) {
                $scope.doLoad();
            }
        }
    })();
});

function legendLabelClickHandler(obj) {
    var scope = angular.element($('body')).scope();
    var id = obj.id.split(".");
    var target = scope.chartState[id[0]][id[1]];
    target.selected = !target.selected;
    scope.enableChartByName(id[1], id[0]);
    scope.safeApply();
 }
