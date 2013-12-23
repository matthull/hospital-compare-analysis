var usMap = dc.geoChoroplethChart('#us-map');

d3.json('hospitals.json', function (hospitals) {
    var data = crossfilter(hospitals);

    stateDim = data.dimension(function (d) {
        return d.State;
    });

    countyDim = data.dimension( function (d) { return { FIPS: d.censusBlock.County.FIPS, name: d.censusBlock.County.Name } });

    stateGroup = stateDim.group().reduceCount();
    countyGroup = countyDim.group().reduceCount();

    d3.json("us.json", function (us) {
        //counties = topojson.feature(us, us.objects.counties);
        states = topojson.feature(us, us.objects.states).features;

        usMap
            .width(480)
            .height(250)
            .dimension(stateDim)
            .group(stateGroup)
            .colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
            .colorDomain([0, 500])
            .colorCalculator(function (d) { return d ? usMap.colors()(d) : '#ccc'; })
            .projection(d3.geo.albersUsa().scale(535).translate([240,125]))
            .overlayGeoJson(states, "state", function (d) {
                return d.properties.name;
            });

        usMap.renderlet(function (chart) {
            chart.root().call(zoom);
        });

        function zoomed() {
            usMap.getPath().projection().translate(d3.event.translate).scale(d3.event.scale);
            usMap.svg().selectAll("g.layer0 path").attr("d", usMap.getPath()).style("stroke-width", "1.5px");
            dc.events.trigger(function () {
                window.visible = states.filter(function (s) {
                    centroid = usMap.getPath().centroid(s);
                    return centroid[0] > 0 && centroid[0] < usMap.width() && centroid[1] > 0 && centroid[1] < usMap.height();
                }).map(function (s) {return s.properties.name});
                var filters = usMap.filters();
                filters.length = 0;
                visible.forEach(function (s) {
                    filters.push(s);
                });
                usMap.redraw();
                //TODO: need to make sure 1 state is always selected
            }, 25);
        }

        window.zoom = d3.behavior.zoom().translate(usMap.getPath().projection().translate()).scale(usMap.getPath().projection().scale()).on("zoom", zoomed);
        dc.renderAll();
    });
});
