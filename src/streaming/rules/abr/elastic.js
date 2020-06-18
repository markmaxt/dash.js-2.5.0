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

import SwitchRequest from '../SwitchRequest.js';
import BufferController from '../../controllers/BufferController.js';
import AbrController from '../../controllers/AbrController.js';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest'; //Variable name is different in different version of dash.js
import FactoryMaker from '../../../core/FactoryMaker.js';
import Debug from '../../../core/Debug.js';
import DashAdapter from '../../../dash/DashAdapter.js';
import MediaPlayerModel from '../../models/MediaPlayerModel.js';
import PlaybackController from '../../controllers/PlaybackController.js';
/* import {getELASTIC, bitratequalitymap, computeQoE, getutilitymetrics} from '../../../../samples/dash-if-reference-player/app/StorStatus.js'; */

function getELASTIC() {}
function bitratequalitymap() {}
function computeQoE() {}
function getutilitymetrics() {}

function ELASTIC(config) {
    let context = this.context; //Default
    let log = Debug(context).getInstance().log; //To write debug log
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
    let AvgSSIMplusQT = 0;
    let AvgSSIMplusQTSwitch = 0;
    let AvgEvtStalls = 0;
    let AvgEvtStallsDuration = 0;
    let TotalSSIMplusQT = 0;
    let PreviousSSIMplusQT = 0;
    let TotalAvgSSIMplusQTSwitch = 0;
    let Check = true;
    let startD = 0;
    let switchNBR = 0;
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
        var averageThroughput; //Default
        var lastRequestThroughput; //Default
        var mediaInfo = rulesContext.getMediaInfo(); //Default
        var mediaType = mediaInfo.type; //Default
        var current = rulesContext.getCurrentValue(); //Default
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
        let LogInfo = [];
        count = count + 1;
        let bitrate = mediaInfo.bitrateList.map(b => b.bandwidth);
        if (duration >= mediaPlayerModel.getLongFormContentDurationThreshold()) {
            bufferMax = mediaPlayerModel.getBufferTimeAtTopQualityLongForm();
        } else {
            bufferMax = mediaPlayerModel.getBufferTimeAtTopQuality();
        }
        play = playbackController.isPaused();
        /*Value of d(t) as in ELAASTIC paper */
        if (play == false)
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
            //callback(switchRequest);
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
        //console.log('The Best Bitrate is: ',bestR, 'lastRequestThroughput:', lastRequestThroughput, 'd:',d,'kp:',kp,'getQ:',getQ,'ki:',ki,'qI',qI);
        if (abrController.getAbandonmentStateFor(mediaType) !== AbrController.ABANDON_LOAD) {
            if (bufferStateVO.state === BufferController.BUFFER_LOADED || isDynamic) {
                newQuality = abrController.getQualityForBitrate(mediaInfo, bestR, 0);
                streamProcessor.getScheduleController().setTimeToLoadDelay(0); // TODO Watch out for seek event - no delay when seeking.!!
                switchRequest = SwitchRequest(context).create(newQuality, SwitchRequest.STRONG);
            }
            if (switchRequest.value !== SwitchRequest.NO_CHANGE && switchRequest.value !== current) {
                log('ELASTIC requesting switch to index: ', switchRequest.value, 'type: ',mediaType, ' Priority: ',
                switchRequest.priority === SwitchRequest.DEFAULT ? 'Default' :
                switchRequest.priority === SwitchRequest.STRONG ? 'Strong' : 'Weak', 'Average throughput', Math.round(averageThroughput), 'kbps');
            }
        }
        return switchRequest;

        let biratelog = (bitrate[switchRequest.value]/1000).toFixed(0);
        let maxbitrate = parseInt((Math.max.apply(Math,bitrate)/1000).toFixed(0));
        let QoEmetrics = getutilitymetrics();
        if (Check == true) {
            startD = QoEmetrics[0];
            Check = false;
        }
        TotalSSIMplusQT = TotalSSIMplusQT + bitratequalitymap(biratelog,CT);
        AvgSSIMplusQT = TotalSSIMplusQT / (count+1);
        AvgSSIMplusQTSwitch = Math.abs(bitratequalitymap(biratelog,CT) - PreviousSSIMplusQT);
        if (AvgSSIMplusQTSwitch != 0 ){
            switchNBR = switchNBR + 1;
        }
        TotalAvgSSIMplusQTSwitch = (TotalAvgSSIMplusQTSwitch + AvgSSIMplusQTSwitch) / (count);
        PreviousSSIMplusQT = bitratequalitymap(biratelog,CT);
        AvgEvtStalls = QoEmetrics[3] / (count+1);
        AvgEvtStallsDuration = QoEmetrics[4] / duration;
        if (isNaN(TotalSSIMplusQT) || isNaN(AvgSSIMplusQTSwitch) || isNaN(AvgEvtStalls) || isNaN(AvgEvtStallsDuration) || isNaN(QoEmetrics[3]) || isNaN(QoEmetrics[4])) {
            TotalSSIMplusQT = 0;
            AvgSSIMplusQTSwitch  = 0;
            AvgEvtStalls = 0;
            AvgEvtStallsDuration = 0;
            QoEmetrics[3] = 0;
            QoEmetrics[4] = 0;
        }
        let QoESTEP =  computeQoE(startD,AvgSSIMplusQT,AvgSSIMplusQTSwitch,AvgEvtStalls,AvgEvtStallsDuration);
        if (QoESTEP > 5) {
            QoESTEP = 5;
        }
        
        
        let QoESTEPV2 = AvgSSIMplusQT - (AvgSSIMplusQTSwitch - maxbitrate*AvgEvtStallsDuration - (((maxbitrate*startD))/duration));
        let QoESTEPV3 = TotalSSIMplusQT - (TotalAvgSSIMplusQTSwitch - maxbitrate*QoEmetrics[4] - maxbitrate*startD);
        let QoESTEPV4 = bitratequalitymap(biratelog,CT) - (AvgSSIMplusQTSwitch - maxbitrate*QoEmetrics[4] - maxbitrate*startD);
            let QoESTEPV5 = TotalSSIMplusQT - (TotalAvgSSIMplusQTSwitch - QoEmetrics[4] - startD);
        
        if (isNaN(QoESTEP) || isNaN(QoESTEPV2) || isNaN(QoESTEPV3) || isNaN(QoESTEPV4) || isNaN(QoESTEPV5)){
            QoESTEP  = 0;
        }
        
LogInfo.push([buff,biratelog,switchRequest.value+1,bitratequalitymap(biratelog,CT),av,Math.round(lastRequestThroughput/1000),QoESTEP,QoESTEPV2,QoESTEPV3,QoESTEPV4,QoESTEPV5,AvgSSIMplusQT,TotalSSIMplusQT,AvgSSIMplusQTSwitch,TotalAvgSSIMplusQTSwitch,switchNBR,AvgEvtStalls,QoEmetrics[3],AvgEvtStallsDuration,QoEmetrics[4],startD,latencyTimeInMilliseconds/1000,downloadTimeInMilliseconds/1000]);
        getELASTIC(LogInfo[0]);
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
