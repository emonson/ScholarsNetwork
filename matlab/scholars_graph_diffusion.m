data_in_dir = '/Users/emonson/Data/Angela/visualization';
data_out_dir = '/Users/emonson/Programming/d3/Scholars/data';

dataset = 'Usam';
% dataset = 'Authorsim';
knn = 15;
knnAuto = 7;
% Scale values to reduce range/skew. .^(2^-data_power_scale)
% use 0 for no scaling
data_power_scale = 0;

PLOT_EV = true;
WRITE_EDGE_CSV = true;

% edge_out_file = 'authorsim_p0_k30a15_diffusion_edges.csv';
edge_out_file = [lower(dataset) '_p' int2str(data_power_scale) '_k' int2str(knn) 'a' int2str(knnAuto) '_diffusion_edges.csv'];

%% Load data

% read in integers corresponding to a department ID
depts = csvread( fullfile(data_out_dir, 'authorsim_departments.csv'), 0, 4);

if strcmp( dataset, 'Usam' );
    load( fullfile(data_in_dir, 'Usam.mat') );
    % Authorsim is row vectors. This routine expects column vectors
    if data_power_scale ~= 0,
        X0 = reshape( Usam{1}(:).^(2^-data_power_scale), size(Usam{1}) )';
    else
        X0 = Usam{1}';
    end
    clear('Usam');
else
    load( fullfile(data_in_dir, 'Authorsim.mat') );
    % Authorsim is row vectors. This routine expects column vectors
    if data_power_scale ~= 0,
        X0 = reshape( Authorsim(:).^(2^-data_power_scale), size(Authorsim) )';
    else
        X0 = Authorsim';
    end
    clear('Authorsim');
end

% Zero or original dimensionality for no pre-compression
projectionDimension = 0;

% Use SVD to reduce dimensionality?
if projectionDimension > 0 && projectionDimension < size(X0,1),
    cm = mean(X0,2);
    X = X0 - repmat(cm, 1, size(X0,2));
    [U,S,V] = randPCA(X, projectionDimension);
    % [U,S,V] = svds(X, projectionDimension);
    X = S*V';
    isCompressed = true;
else
    X = X0;
    isCompressed = false;
end;
clear X0;

%% Graph diffusion

GraphDiffusionOpts = struct();
GraphDiffusionOpts.KNN = knn;
GraphDiffusionOpts.kNNAutotune = knnAuto;
GraphDiffusionOpts.Display = 0;
GraphDiffusionOpts.kEigenVecs = 20;
GraphDiffusionOpts.Symmetrization = 'W+Wt';
GraphDiffusionOpts.NNMaxDim = 100;
GraphDiffusionOpts.FastNNSearcher = '';

% Do Diffusion Mapping
Graph = GraphDiffusion( X, 0, GraphDiffusionOpts );

%% Plotting and edge list CSV output

% Plot diffusion embedding
if PLOT_EV,
    figure; 
    ev = Graph.EigenVecs;
    scatter3(ev(:,2),ev(:,3),ev(:,4),20,depts(2:end,1),'o');
    colorbar;
    axis vis3d;
    drawnow();
end

% Write out CSV of diffusion graph
if WRITE_EDGE_CSV,
    W = Graph.W;
    % Since W is symmetric, and we don't need self-connections
    % only grab upper triangular above diagonal for graph edges
    [r,c,v] = find(triu(W,1));
    % d3 wants 0-based indices/IDs, so subtract 1 from all rows and edges
    % also add an edge ID for d3 keeping track of edge data elements
    % will need to add edge_id,source,target,weight header later
    % csvwrite(fullfile(data_out_dir, edge_out_file), [[0:(length(r)-1)]' r-1 c-1 v]);
    fid = fopen(fullfile(data_out_dir, edge_out_file), 'w');
	fprintf(fid, 'edge_id,source,target,weight\n');
    fclose(fid);
    dlmwrite(fullfile(data_out_dir, edge_out_file), [[0:(length(r)-1)]' r-1 c-1 v], '-append', 'delimiter', ',');
end
