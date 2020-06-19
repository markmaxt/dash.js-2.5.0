/*******************************************************
 * Copyright (C) 2017-2018 GTA by Abdelhak Bentaleb, NUS, bentaleb@comp.nus.edu.sg
 * 
 * This file is part of GTA.
 * 
 * GTA can not be copied and/or distributed without the express
 * permission of Abdelhak Bentaleb and NUS.
 *
 * Written by Praveen Kumar Yadav, NUS, and modified by Abdelhak Bentaleb <bentaleb@comp.nus.edu.sg>, 2018.
 * 
 *******************************************************/
// (nyhuang) Modified.
import SwitchRequest from '../SwitchRequest.js';
import BufferController from '../../controllers/BufferController.js';
import AbrController from '../../controllers/AbrController.js';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest'; //Variable name is different in different version of dash.js
import FactoryMaker from '../../../core/FactoryMaker.js';
import Debug from '../../../core/Debug.js';
import DashAdapter from '../../../dash/DashAdapter.js';
import MediaPlayerModel from '../../models/MediaPlayerModel.js';
import PlaybackController from '../../controllers/PlaybackController.js';

function ELASTIC(config) {
    let context = this.context; //Default
    let dashMetrics = config.dashMetrics; //Default
    let metricsModel = config.metricsModel; //Default
    let bufferMax; //To store buffer capacity
    let instance,
        throughputArray, //Array to store segment download throughput
        fragmentDict, //Default
        av, //last throughput
        adapter, //Default
        qT, //Variable as in ELASTIC paper
        qI; //Variable as in ELASTIC paper
    var count;
    let bitrate;

    function setup() {
        throughputArray = [];
        fragmentDict = {};
        adapter = DashAdapter(context).getInstance();
        qT = 0;
        qI = 0;
        count  = -1;
        bitrate = [];
    }

    //Store throughput in array
    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        if (throughput < 100000000) //Due to bug in dash.js, some very high flase throughput were getting reported. Remove it, if bug is fixed in the impremented version.
        {
            throughputArray[type].push(throughput);
        }
    }
    /* Retuen last throughput as required in ELASTIC */
    function averageThroughputByType(type) {
        var arrThroughput = throughputArray[type];
        var lenThroughput = arrThroughput.length;
        av = (arrThroughput[lenThroughput - 1]);
        return (av);
    }


    function getMaxIndex(rulesContext) {
        var downloadTime; //Default
        var lastRequestThroughput; //Default
        var mediaInfo = rulesContext.getMediaInfo(); //Default
        var mediaType = mediaInfo.type; //Default
        var metrics = metricsModel.getReadOnlyMetricsFor(mediaType); //Default
        var streamProcessor = rulesContext.getStreamProcessor(); //Default
        var abrController = streamProcessor.getABRController(); //Default
        var isDynamic = streamProcessor.isDynamic(); //Default
        var lastRequest = dashMetrics.getCurrentHttpRequest(metrics);
        var bufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null; //Default
        var bufferLevelVO = (metrics.BufferLevel.length > 0) ? metrics.BufferLevel[metrics.BufferLevel.length - 1] : null; //Default
        var switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK);
        let streamInfo = rulesContext.getStreamInfo(); //Stram information
        let duration = streamInfo.manifestInfo.duration; //Duration of video
        let bestR; // the bitrate suggested
        var newQuality; //Bitrate requested
        var buff = dashMetrics.getCurrentBufferLevel(metrics) ? dashMetrics.getCurrentBufferLevel(metrics) : 0.0; //Current Buffer Occupancy
        var play,d, getQ; //Temp variables
        let trackInfo = rulesContext.getTrackInfo();
        let fragmentDuration = trackInfo.fragmentDuration;
        let mediaPlayerModel = MediaPlayerModel(context).getInstance();
        let playbackController = PlaybackController(context).getInstance();
        let kp = 0.01;/*kp value i.e 0.01 is same as in paper. ki is modified as 0.0001 to avoid negative values of bitrate*/
        let ki = 0.001; // ki = 0.0001

        count = count + 1;
        if (duration >= mediaPlayerModel.getLongFormContentDurationThreshold()) {
            bufferMax = mediaPlayerModel.getBufferTimeAtTopQualityLongForm();
        } else {
            bufferMax = mediaPlayerModel.getBufferTimeAtTopQuality();
        }
        play = playbackController.isPaused();
        /*Value of d(t) as in ELAASTIC paper */
        if (!play)
        {
            d = 1;
        }
        else
        {
            d = 0;
        }
        qT = bufferMax / (2 * fragmentDuration); //Target buffer as half of buffer capacity in terms of number of segments
        getQ = buff / fragmentDuration;
        //DASH.js way of getting throughput//
        if (!metrics || !lastRequest || lastRequest.type !== HTTPRequest.MEDIA_SEGMENT_TYPE ||
            !bufferStateVO || !bufferLevelVO ) {
            return switchRequest;
        }
        let downloadTimeInMilliseconds;
        let latencyTimeInMilliseconds;
        if (lastRequest.trace && lastRequest.trace) {
            latencyTimeInMilliseconds = (lastRequest.tresponse.getTime() - lastRequest.trequest.getTime()) || 1;
            downloadTimeInMilliseconds = lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime() + 1;
            const bytes = lastRequest.trace.reduce((a, b) => a + b.b[0], 0);
            lastRequestThroughput = Math.round((bytes * 8) / (downloadTimeInMilliseconds / 1000));
            storeLastRequestThroughputByType(mediaType, lastRequestThroughput);
        }

        av = averageThroughputByType(mediaType) / 1000;
        downloadTime  = downloadTimeInMilliseconds/1000;
        qI = qI + downloadTime * (getQ - qT);
        bestR = ((lastRequestThroughput / (d - (kp * getQ) - (ki * qI)))/1000).toFixed(0); /*kp value i.e 0.01 is same as in paper. ki is modified as 0.0001 to vaois negative values of bitrate*/
        if (abrController.getAbandonmentStateFor(mediaType) !== AbrController.ABANDON_LOAD) {
            if (bufferStateVO.state === BufferController.BUFFER_LOADED || isDynamic) {
                newQuality = abrController.getQualityForBitrate(mediaInfo, bestR, 0);
                streamProcessor.getScheduleController().setTimeToLoadDelay(0); // TODO Watch out for seek event - no delay when seeking.!!
                switchRequest = SwitchRequest(context).create(newQuality, SwitchRequest.STRONG);
            }
        }
        return switchRequest;
    }

    function reset() {
        setup();
    }

    instance = {
    getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;

}

ELASTIC.__dashjs_factory_name = 'ELASTIC';
export default FactoryMaker.getClassFactory(ELASTIC);
