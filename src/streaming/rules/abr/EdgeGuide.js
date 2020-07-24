/**************************************************************
 A template for edge assisted scheme
 Created by Xiaoteng Ma
 *************************************************************/

import SwitchRequest from '../SwitchRequest.js';
import FactoryMaker from '../../../core/FactoryMaker.js';
import DashAdapter from '../../../dash/DashAdapter.js';
import {EdgeUrl, GetTrack} from '../../CustomConfiguration.js';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest'; // Pay attention to the name of the variable

function EdgeGuide(config) {

    let context = this.context; //Default
    let dashMetrics = config.dashMetrics; //Default
    let metricsModel = config.metricsModel; //Default
    let instance, //Default
        throughputArray, //Array stores the throughput
        bitrateArray,
        av, //Last value of throughput
        bv, //Last value of bitrate
        bitrate, //array to store list of availalbe bitrate
        bitrateCount, //number of available bitrate
        adapter; //Default
    /*Compute QoE varaibles*/
    var count;

    function setup() {
        throughputArray = [];
        bitrateArray = [];
        adapter = DashAdapter(context).getInstance();
        av = 0;
        bv = 0;
        bitrate = [];
        bitrateCount = 0;
        count = -1;
    }

    function getMaxIndex(rulesContext) {
        var mediaInfo = rulesContext.getMediaInfo(); //Default
        var mediaType = mediaInfo.type; //Default
        var metrics = metricsModel.getReadOnlyMetricsFor(mediaType); //Default
        var buff = dashMetrics.getCurrentBufferLevel(metrics) ? dashMetrics.getCurrentBufferLevel(metrics) : 0.0; //current buffr occupancy
        var lastRequest = dashMetrics.getCurrentHttpRequest(metrics);
        var switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK);

        if(!metrics || !lastRequest || lastRequest.type !== HTTPRequest.MEDIA_SEGMENT_TYPE) {
            return switchRequest;
        }

        // Upload to the edge
        var video_name = lastRequest._serviceLocation.match(/http:\/\/(\S*)\/(\S*)\//)[2];
        let url = EdgeUrl + GetTrack;
        let request = new XMLHttpRequest();
        let data = new FormData();
        data.append('buffer', buff);
        data.append('timestamp', new Date().getTime());
        data.append('video_name', video_name);
        data.append('raw_url', lastRequest.url);
        data.append('client_id', metrics.ClientId[0]);
        request.open('POST', url, false);
        request.send(data);

        var track = parseInt(request.responseText);
        switchRequest = SwitchRequest(context).create(track, SwitchRequest.STRONG);
        return (switchRequest);
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

EdgeGuide.__dashjs_factory_name = 'EdgeGuide';
export default FactoryMaker.getClassFactory(EdgeGuide);
