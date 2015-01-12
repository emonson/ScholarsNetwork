var GLOBALS = (function($,parseUri){

	var globals = { version: '0.0.1' };
		
	// Make it easier to swtich the server config when switching between machines
	$.ajax({
		url:'server_conf.json',
		async:false,
		dataType:'json',
		success:function(data) {
			globals.data_proxy_root = "http://" + data.server_name + "/remote" + data.path_port;
		}
	});	
	
	// Grabbing possible data set names
	$.ajax({
		url:globals.data_proxy_root + '/resource_index/datasets',
		async:false,
		dataType:'json',
		success:function(data) {
			globals.dataset_names = data;
		}
	});	
	
	// Passing initial data set value through in parameters. default to first in list
	// TODO: handle no list!!
	globals.uri = parseUri(location.toString());
	globals.dataset = globals.uri.queryKey.data || globals.dataset_names[globals.dataset_names.length-1];
	
	// Now that we have a dataset name, grabbing information about original data type and dimensions
	$.ajax({
		url:globals.data_proxy_root + '/' + globals.dataset + '/datainfo',
		async:false,
		dataType:'json',
		success:function(data) {
			globals.data_type = data.datatype;
			globals.data_shape = data.shape;
			globals.data_bounds = data.alldata_bounds;
		}
	});	

	// Both ends of time filter slider set to -1 until initialized with real values
	globals.time_width = -1;
	globals.time_center = -1;
	globals.time_range = [-1, -1];
	
	globals.path_depth = 2;

	// Keeping value for type of ellipses to grab/display in globals for now
	// TODO: should set combo boxes from these or grab combo box defaults and store here...
	globals.ellipse_type = 'diffusion';
	globals.ellipse_color = 'gray';
	globals.path_color = 'brown';
	
	// Path and ellipse data
	globals.path_pairs = {};
	globals.path_info = {};
	globals.ellipse_data = {};
	
	// Keep track of previous center, clicked destination center, and previous transformation matrix
	// (which eliminates rotation of coordinates bewteeen districts)
	globals.district_id = -1;
	globals.prev_district = -1;
	globals.R_old = "1.0, 0.0, 0.0, 1.0";
	
	// Network (overview) data
	globals.nodes = {};
	globals.edges = {};
	globals.nodescalars = [];
	globals.selectColor = "gold";
	globals.node_color = "time";
	globals.t_max_idx = -1;
	globals.transit_time_color_limit = -1;
	globals.edge_types = ['overlapping_symmetric_wedges',
												'asymmetric_clockwise_wedges',
												'pushing_symmetric_wedges'];
												// TODO: 'thick_lines'
	globals.edge_type = "x";
	// DEBUG
	// globals.node_time_lists = [];
	globals.node_size_schemes = ['constant',
															 'time'];
	globals.node_size_scheme = globals.node_size_schemes[1];
	globals.min_node_size = 1;
	globals.fixed_node_size = 7;

	return globals;

}(jQuery,parseUri));

