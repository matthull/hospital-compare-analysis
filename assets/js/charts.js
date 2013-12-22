var usMap = dc.geoChoroplethChart('#us-map');

//d3.csv('Hospital_Data.csv', function (hospitalData) {
    //window.hospitalData = hospitalData.map(function (h) {
        //fullAddress = [h['Address 1']];
        //if (!!h['Address 2']) fullAddress.push(h['Address 2']);
        //fullAddress.push([ h['City'], h['State'], h['ZIP Code'] ]);
        //h['Full Address'] = fullAddress.join(',+')
        //h['Full Address'] = h['Full Address'].replace(' ', '+');
        //return h;
    //});

    //hospitalData = hospitalData.map(function (h) {

        //d3.json('http://www.mapquestapi.com/geocoding/v1/address?key=Fmjtd%7Cluubn10anq%2C2s%3Do5-90bwgf&location=1555 Blake St,Denver,CO,80202', function (resp) {
            //h.latLng = resp.results[0].locations[0].latLng;
            //return h;
        //});
    //});

d3.json('hospitals.json', function (hospitalData) {
    var data = crossfilter(hospitalData);

    window.stateDim = data.dimension(function (d) {
        return d.State;
    });

    window.stateGroup = stateDim.group().reduceCount();

    d3.json("us-states.json", function (states) {
        d3.json("us-counties.json", function (counties) {

            usMap.width(960)
                    .height(500)
                    .dimension(stateDim)
                    .group(stateGroup)
                    .colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
                    .colorDomain([0, 500])
                    .colorCalculator(function (d) { return d ? usMap.colors()(d) : '#ccc'; })
                    .projection(d3.geo.albersUsa())
                    .overlayGeoJson(states.features, "state", function (d) {
                        return d.properties.name;
                    });

            usMap.renderlet(function (chart) {
                chart.root().call(zoom);
            });

            function zoomed() {
                usMap.getPath().projection().translate(d3.event.translate).scale(d3.event.scale);
                dc.events.trigger(function () {
                    usMap.svg().selectAll("g.layer0 path").attr("d", usMap.getPath());
                    window.visible = states.features.filter(function (s) {
                        var centroid = usMap.getPath().centroid(s);
                        return centroid[0] > 0 && centroid[0] < usMap.width() && centroid[1] > 0 && centroid[1] < usMap.height()
                    }).map(function (s) {return s.properties.name});
                    var filters = usMap.filters();
                    filters.length = 0;
                    visible.forEach(function (s) {
                        filters.push(s);
                    });
                    usMap.redraw();
                    //TODO: need to make sure 1 state is always selected
                    //TODO: better line sizes - currently gets thicker as you zoom out
                }, 5);
            }

            window.zoom = d3.behavior.zoom().translate(d3.geo.albersUsa().translate()).scale(d3.geo.albersUsa().scale()).on("zoom", zoomed);
            dc.renderAll();
        });
    });
});
