// http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/

//Constants for the SVG
var width = 900,
    height = 600;

//Set up the colour scale
var color = d3.scale.category20();
var x_scale = d3.scale.linear().domain([-9500, 4200]).range([0, width]);
var y_scale = d3.scale.linear().domain([-5110, 4100]).range([0, height]);
var r_scale = d3.scale.linear().domain([40, 120]).range([4, 12]);

//Set up the force layout
var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

//Append a SVG to the body of the html page. Assign this SVG as an object to svg
var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

//Read the data from a json file
var graph = {};

// Helper function for parsing nodes (authors departments positions) CSV
var depts_accessor = function(d) { 
    // "unary plus" is the fastest way to change from a string to a number
    d.id = +d.id;
    d.dept_id = +d.dept_id;
    d.mod_class = +d.mod_class;
    d.x = +d.x;
    d.y = +d.y;
    // keep nodes from moving in d3 layout
    d.fixed = true;
    return d;
};

// Helper function for parsing nodes (authors departments positions) CSV
var edges_accessor = function(d) { 
    // "unary plus" is the fastest way to change from a string to a number
    d.edge_id = +d.edge_id;
    d.source = +d.source;
    d.target = +d.target;
    d.weight = +d.weight;
    return d;
};

// Use d3 for parsing csv directly instead of having to change it into json
d3.csv('data/fa2_p0_k50a30.csv', depts_accessor, load_edges);

var load_edges = function(node_data) {
    graph.nodes = node_data;
    d3.csv('data/authorsim_p0_k50a30_diffusion_edges.csv', edges_accessor, init_vis);
};

var init_vis = function(edge_data) {
    
    graph.links = edge_data;
    
    //Toggle stores whether the highlighting is on
    var toggle = 0;
    //Create an array logging what is connected to what
    var linkedByIndex = {};
    for (i = 0; i < graph.nodes.length; i++) {
        linkedByIndex[i + "," + i] = 1;
    };
    graph.links.forEach(function (d) {
        linkedByIndex[d.source.index + "," + d.target.index] = 1;
    });
    //This function looks up whether a pair are neighbours
    function neighboring(a, b) {
        return linkedByIndex[a.index + "," + b.index];
    }
    function connectedNodes() {
        if (toggle == 0) {
            //Reduce the opacity of all but the neighbouring nodes
            d = d3.select(this).node().__data__;
            node.style("opacity", function (o) {
                return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
            });
            //Reduce the op
            toggle = 1;
        } else {
            //Put them back to opacity=1
            node.style("opacity", 1);
            toggle = 0;
        }
    }

    // Testing click link filter
    function neighbor_links() {
    }
    
    // Creates the graph data structure out of the json data
    force.nodes(graph.nodes)
        .links(graph.links)
        .start();

    // Create all the line svgs but without locations yet
    var link = svg.selectAll(".link")
            .data(graph.links)
        .enter();
    //         .append("line")
    //         .attr("class", "link");
    //     // .style("stroke-width", function (d) { return Math.sqrt(d.value); });

    //Do the same with the circles for the nodes - no 
    var node = svg.selectAll(".node")
            .data(graph.nodes)
        .enter()
            .append("circle")
            .attr("class", "node")
            .attr("r", function(d) { return r_scale(d.size); })
            .style("fill", function (d) { return color(d.mod_class); })
            .call(force.drag)
            .on('click', connectedNodes);


    //Now we are giving the SVGs co-ordinates - the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements
    force.on("tick", function () {
    //     link.attr("x1", function (d) { return d.source.x; })
    //         .attr("y1", function (d) { return d.source.y; })
    //         .attr("x2", function (d) { return d.target.x; })
    //         .attr("y2", function (d) { return d.target.y; });
    // 
        node.attr("cx", function (d) { return d.x; })
             .attr("cy", function (d) { return d.y; });
    });

};  // init_vis()

