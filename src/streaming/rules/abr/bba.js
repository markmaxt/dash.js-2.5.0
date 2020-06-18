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
/* import {getBBA, bitratequalitymap, computeQoE, getutilitymetrics} from '../../../../samples/dash-if-reference-player/app/StorStatus.js'; */

function getBBA() {}
function bitratequalitymap() {}
function computeQoE() {}
function getutilitymetrics() {}

function BBA(config) {

    let context = this.context; //Default
    let log = Debug(context).getInstance().log; //To write debug log
    let dashMetrics = config.dashMetrics; //Default
    let metricsModel = config.metricsModel; //Default
    let bufferMax; //To store buffer capacity
    let mediaPlayerModel; //Default
    let instance, //Default
        throughputArray, //Array to store segment download throughput
        bitrateArray, //Array to store bitrate of downloaded segment
        plusIndex, //Index of one higher bitrate than the current bitrate
        minIndex, //min Index as in BBA paper
        minusIndex, //Index of one lower bitrate than the current bitrate
av, //last value of throughput
        bv, //last value of bitrate
        actBuff, //as in BBA paper
        fBuffNow, //temproray variable
        lowRes, //lower reservoir
        upRes, // upper reservoir
        buffInterval, //temproray variable
        bitrate, //array to store list of availalbe bitrate
        bitrateCount, //number of available bitrate
        adapter; //Default
    /*Compute QoE varaibles*/
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

    function setup() {
        throughputArray = [];
        bitrateArray = [];
        adapter = DashAdapter(context).getInstance();
        plusIndex = 0;
        minIndex = 0;
        minusIndex = 0;
        av = 0;
        bv = 0;
        actBuff = 0;
        fBuffNow = 0;
        lowRes = 0;
        upRes = 0;
        buffInterval = 0;
        bitrate = [];
        bitrateCount = 0;
        count = -1;
    }

    /* Function to return bitrate corresponds to current buffer occupancy*/
    function mapBitrate(buff) {
        var returnBitrate = 0;
        returnBitrate = bitrate[0] + (((bitrate[bitrateCount - 1] - bitrate[0]) /
(bufferMax - lowRes - upRes)) * (buff - lowRes));
        return (returnBitrate / 1000);
    }

    //Store throughput in array
    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        //Due to bug in dash.js, some very high flase throughput were getting reported. Remove it, if bug is fixed in thee impremented version.
        if (throughput < 100000000) {
            throughputArray[type].push(throughput);
        }
    }

    //Throughput Predection and smoothing
    /*Just the last throughput*/
    function averageThroughputByType(type) {
        var arrThroughput = throughputArray[type];
        var lenThroughput = arrThroughput.length;
        av = arrThroughput[lenThroughput - 1];
        return (av);
    }



    function getMaxIndex(rulesContext) {
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
        let bestR; // To store the bitrate to be requested
        var newQuality = 0; //Newly selected bitrate
        var buff = dashMetrics.getCurrentBufferLevel(metrics) ? dashMetrics.getCurrentBufferLevel(metrics) : 0.0; //current buffr occupancy
        var repSwitch = dashMetrics.getCurrentRepresentationSwitch(metrics);
        var streamIdx = streamInfo.index;
        var currentIndex = dashMetrics.getIndexForRepresentation(repSwitch.to, streamIdx);
        let bitrate = mediaInfo.bitrateList.map(b => b.bandwidth);
        let i;
        let lowResRatio = 90 / 240; //lower reservior ratio
        let upResRatio = 24 / 240; //upper reservoir ratio
        bitrateCount = bitrate.length;
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        count = count + 1;
		let LogInfo = [];

        if (duration >= mediaPlayerModel.getLongFormContentDurationThreshold()) {
            bufferMax = mediaPlayerModel.getBufferTimeAtTopQualityLongForm();
        } else {
            bufferMax = mediaPlayerModel.getBufferTimeAtTopQuality();
        }

        //dash.js has variable buffer basd on duration of video. Lower and upper reserve are maintained in same ratio of buffer as given in paper
        lowRes = bufferMax * lowResRatio;
        upRes = bufferMax * upResRatio;
        actBuff = bufferMax - (lowRes + upRes); //cussion in algo
        //Getting throughput// /*Value not necessary for BBA*/
        if (!metrics || !lastRequest || lastRequest.type !== HTTPRequest.MEDIA_SEGMENT_TYPE ||
         !bufferStateVO || !bufferLevelVO ) {
            //callback(switchRequest);
            return switchRequest;
        }
        let downloadTimeInMilliseconds;
        let latencyTimeInMilliseconds;

        if (lastRequest.trace && lastRequest.trace.length) {
            latencyTimeInMilliseconds = (lastRequest.tresponse.getTime() - lastRequest.trequest.getTime()) || 1;
            downloadTimeInMilliseconds = lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime() + 1; //Make sure never 0 we divide by this value. Avoid infinity!
            const bytes = lastRequest.trace.reduce((a, b) => a + b.b[0], 0);
            lastRequestThroughput = Math.round((bytes * 8) / (downloadTimeInMilliseconds / 1000));
            storeLastRequestThroughputByType(mediaType, lastRequestThroughput);
        }
        av = averageThroughputByType(mediaType) / 1000;
        fBuffNow = mapBitrate(buff);
        if (currentIndex == (bitrateCount - 1))
        {
            plusIndex = bitrateCount - 1;
        }
        else
        {
            plusIndex =  minIndex + 1;

        }
        if (currentIndex == 0)
        {
            minusIndex = 0;
        }
        else
        {
            minusIndex = minIndex - 1;
        }
        if (buff <= lowRes)
        {
            minIndex = 0;
        }
        else if (buff >= (actBuff + lowRes))
        {
            minIndex = bitrateCount - 1;
        }
        else if (fBuffNow >= plusIndex)
        {
            for (i = 0; i < bitrateCount && (bitrate[i] / 1000) < fBuffNow; i++)
            {
                minIndex = i;
            }
            // minIndex = fBuffNow-1;
        }
        else if (fBuffNow <= minusIndex)
        {
            for (i = bitrateCount - 1; i >= 0 && (bitrate[i] / 1000) > fBuffNow; i--)
            {
                minIndex = i;
            }
            //minIndex =  fBuffNow+1;
        }
        else
        {
            minIndex = currentIndex;
        }




        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        abrController.setAverageThroughput(mediaType, lastRequestThroughput);
        if (abrController.getAbandonmentStateFor(mediaType) !== AbrController.ABANDON_LOAD) {
            if (bufferStateVO.state === BufferController.BUFFER_LOADED || isDynamic) {
                bestR = Math.ceil(bitrate[minIndex] / 1000);
                newQuality = abrController.getQualityForBitrate(mediaInfo, bestR, 0);
                streamProcessor.getScheduleController().setTimeToLoadDelay(0); // TODO Watch out for seek event - no delay when seeking.!!
                switchRequest = SwitchRequest(context).create(newQuality, SwitchRequest.STRONG);
            }

            if (switchRequest.value !== SwitchRequest.NO_CHANGE && switchRequest.value !== current) {
                log('Quetra requesting switch to index: ', switchRequest.value, 'type: ',mediaType, ' Priority: ',
                    switchRequest.priority === SwitchRequest.DEFAULT ? 'Default' :
                        switchRequest.priority === SwitchRequest.STRONG ? 'Strong' : 'Weak', 'Average throughput', Math.round(averageThroughput), 'kbps');
            }
        }
        
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
		TotalAvgSSIMplusQTSwitch = (TotalAvgSSIMplusQTSwitch + AvgSSIMplusQTSwitch) / (count); //indexbitswitch
        PreviousSSIMplusQT = bitratequalitymap(biratelog,CT); //  === QTselected
		AvgEvtStalls = QoEmetrics[3] / (count+1);
		//VideoDuration = 
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
		getBBA(LogInfo[0]);
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

BBA.__dashjs_factory_name = 'BBA';
export default FactoryMaker.getClassFactory(BBA);
