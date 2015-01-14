// http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/

//Constants for the SVG
var width = 900,
    height = 600;

//Set up the colour scale
var x_scale = d3.scale.linear().domain([-9500, 4200]).range([0, width]);
var y_scale = d3.scale.linear().domain([-5110, 4100]).range([0, height]);
var color = d3.scale.category20b()
    .domain([1, 72]);
    
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
var node_neighbors;
var node_edges;

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
var load_nodes = function() {
    d3.csv('data/fa2_p0_k50a30.csv', depts_accessor, load_edges);
};

var load_edges = function(node_data) {
    // Pre-scale all xy positions so dragging works properly
    x_scale.domain(d3.extent(node_data, function(d){return d.x;}));
    y_scale.domain(d3.extent(node_data, function(d){return d.y;}));
    for (var ii=0; ii<node_data.length; ii++) {
        node_data[ii].x = x_scale(node_data[ii].x);
        node_data[ii].y = y_scale(node_data[ii].y);
    }
    graph.nodes = node_data;
    d3.csv('data/authorsim_p0_k50a30_diffusion_edges.csv', edges_accessor, init_vis);
};

var init_vis = function(edge_data) {
    
    graph.links = edge_data;
    
    //Toggle stores whether the highlighting is on
    var toggle = 0;

    // Creates the graph data structure out of the json data
    force.nodes(graph.nodes)
        .links(graph.links)
        .start();

    // Create data structure to hold references to neighboring nodes and links
    var n_nodes = graph.nodes.length;
    node_neighbors = new Array(n_nodes);
    node_edges = new Array(n_nodes);
    for (var ii=0; ii<n_nodes; ii++) {
        node_neighbors[ii] = [];
        node_edges[ii] = [];
    }
    graph.links.forEach(function(d,i){
        node_neighbors[d.source.id].push(d.target);
        node_neighbors[d.target.id].push(d.source);
        node_edges[d.source.id].push(d);
        node_edges[d.target.id].push(d);
    });
    
    var connected_nodes = function(D) { 
            // Create all the line svgs but without locations yet
        var link = svg.selectAll(".link")
                .data(node_edges[D.id], function(d){return d.edge_id;})
            .attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });
        
        link.enter()
            .append("line")
            .attr("class", "link")
            .attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; });
        
        link.exit()
            .remove();

            // .style("stroke-width", function (d) { return Math.sqrt(d.value); });

    };

    //Do the same with the circles for the nodes - no 
    var node = svg.selectAll(".node")
            .data(graph.nodes, function(d){ return d.id; })
        .enter()
            .append("circle")
            .attr("class", "node")
            .attr("r", 4)
            .style("fill", function (d) { return color(d.dept_id); })
            .call(force.drag)
            .on('click', connected_nodes);


    //Now we are giving the SVGs co-ordinates - the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements
    force.on("tick", function () {
        node.attr("cx", function (d) { return d.x; })
             .attr("cy", function (d) { return d.y; });
    });


};  // init_vis()

// Start data loading 
load_nodes();

