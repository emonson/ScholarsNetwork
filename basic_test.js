// http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/

//Constants for the SVG
var width = 900,
    height = 600;

//Set up the colour scale
var color = d3.scale.category20();
var x_scale = d3.scale.linear().domain([-9500, 4200]).range([0, width]);
var y_scale = d3.scale.linear().domain([-5110, 4100]).range([0, height]);

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

$.ajax({
    url:'/data/authorsim_diffusion_nodes.json',
    async:false,
    dataType:'json',
    success:function(data) {
        graph.nodes = data;
    }
});	
$.ajax({
    url:'/data/authorsim_diffusion_edges.json',
    async:false,
    dataType:'json',
    success:function(data) {
        graph.links = data;
    }
});	

//Creates the graph data structure out of the json data
force.nodes(graph.nodes)
    .links(graph.links)
    .start();

//Create all the line svgs but without locations yet
var link = svg.selectAll(".link")
        .data(graph.links);
//     .enter()
//         .append("line")
//         .attr("class", "link");
//     // .style("stroke-width", function (d) { return Math.sqrt(d.value); });

//Do the same with the circles for the nodes - no 
var node = svg.selectAll(".node")
        .data(graph.nodes)
    .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", 4)
        .style("fill", function (d) { return color(d.mod_class); })
        .call(force.drag);


//Now we are giving the SVGs co-ordinates - the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements
force.on("tick", function () {
    link.attr("x1", function (d) { return x_scale(d.source.x); })
        .attr("y1", function (d) { return y_scale(d.source.y); })
        .attr("x2", function (d) { return x_scale(d.target.x); })
        .attr("y2", function (d) { return y_scale(d.target.y); });

    node.attr("cx", function (d) { return x_scale(d.x); })
         .attr("cy", function (d) { return y_scale(d.y); });
});

