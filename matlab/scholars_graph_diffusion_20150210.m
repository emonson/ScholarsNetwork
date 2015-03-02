data_dir = '/Users/emonson/Dropbox/ScholarsData/newresults4visual';

% dataset = 'forums_topics';
dataset = 'authors_topics';
% dataset = 'authors_authors';

knn = 50;
knnAuto = 30;
% Scale values to reduce range/skew. .^(2^-data_power_scale)
% use 0 for no scaling
data_power_scale = 0;
% Zero or original dimensionality for no pre-compression
projectionDimension = 0;

PLOT_EV = false;
WRITE_EDGE_CSV = true;

% edge_out_file = 'authorsim_p0_k30a15_diffusion_edges.csv';
edge_out_file = [lower(dataset) '_lscaled_p' int2str(data_power_scale) '_k' int2str(knn) 'a' int2str(knnAuto) '_diffusion_edges.csv'];

%% Load data

% read in integers corresponding to a department ID
depts = csvread( fullfile(data_dir, 'authors_departments_20150210.csv'), 0, 4);
load( fullfile(data_dir, 'tdresults.mat') );

% Want to scale by lambda and reduce dimensionality by only including
% high-lambda topicsj
% NOTE: not sure this is a good cutoff value for all datasets!
high_topics = lambda > 1.0;

% Note: topic matrices are row vectors. Graph diffusion expects column vectors
if strcmp( dataset, 'authors_topics' ),
    at = U{1}(:,high_topics) .* repmat(lambda(high_topics), size(U{1},1), 1);
    if data_power_scale ~= 0,
        X0 = reshape( at(:).^(2^-data_power_scale), size(at) )';
    else
        X0 = at';
    end
elseif strcmp( dataset, 'forums_topics' ),
    ft = U{3}(:,high_topics) .* repmat(lambda(high_topics), size(U{3},1), 1);
    if data_power_scale ~= 0,
        X0 = reshape( ft(:).^(2^-data_power_scale), size(ft) )';
    else
        X0 = ft';
    end
elseif strcmp( dataset, 'authors_authors' ),
    at = U{1}(:,high_topics) .* repmat(lambda(high_topics), size(U{1},1), 1);
    aa = at * at';
    if data_power_scale ~= 0,
        X0 = reshape( aa(:).^(2^-data_power_scale), size(aa) )';
    else
        X0 = aa';
    end
else
    fprintf('invalid dataset\n');
end

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
    fid = fopen(fullfile(data_dir, edge_out_file), 'w');
	fprintf(fid, 'edge_id,source,target,weight\n');
    fclose(fid);
    dlmwrite(fullfile(data_dir, edge_out_file), [[0:(length(r)-1)]' r-1 c-1 v], '-append', 'delimiter', ',');
end
