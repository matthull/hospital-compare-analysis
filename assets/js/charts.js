var usMap = dc.geoChoroplethChart('#us-map');
//var bogusChart = dc.bubbleChart('#bogus-chart')

d3.csv('Hospital_Data.csv', function (hospitalData) {
    var data = crossfilter(hospitalData);

    window.stateDim = data.dimension(function (d) {
        return d.State;
    });

    window.stateGroup = stateDim.group().reduceCount();
    window.bogusGroup = stateDim.group().reduceSum(function (s) { return s['ZIP Code']; });


    d3.json("us-states.json", function (statesJson) {
        window.states = statesJson;

        usMap.width(960)
                .height(500)
                .dimension(stateDim)
                .group(stateGroup)
                .colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
                .colorDomain([0, 500])
                .colorCalculator(function (d) { return d ? usMap.colors()(d) : '#ccc'; })
                .projection(d3.geo.albersUsa())
                .overlayGeoJson(statesJson.features, "state", function (d) {
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
                    return centroid[0] > 0 && centroid[0] < usMap.width() && centroid[1] > 0 && centroid[1] < usMap.width()
                    //console.log('centroid for state '+ s.properties.name+ ' is ' + usMap.getPath().centroid(s));
                }).map(function (s) {return s.properties.name});
                var filters = usMap.filters();
                filters.length = 0;
                visible.forEach(function (s) {
                    filters.push(s);
                });
                usMap.redraw();
                // need to make sure 1 state is always selected
            }, 5);
        }

        window.zoom = d3.behavior.zoom().translate(d3.geo.albersUsa().translate()).scale(d3.geo.albersUsa().scale()).on("zoom", zoomed);

        //bogusChart
            //.width(300)
            //.height(300)
            //.dimension(stateDim)
            //.group(bogusGroup)
            //.keyAccessor(function (d) { return d.value / 2})
            //.valueAccessor(function (d) {
                //return d.value})
            //.radiusValueAccessor(function () { return 10 })
            //.x(d3.scale.linear().domain([1111111, 9999999]))
            //.y(d3.scale.linear().domain([1111111, 9999999]))

        dc.renderAll();
    });
});
