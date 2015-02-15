data_dir = '~/Dropbox/ScholarsData/newresults4visual';
edge_sqrt_out_file = 'forum_forum_norm_sqrt_eges.csv';
edge_bin_out_file = 'forum_forum_norm_bin_eges.csv';
WRITE_EDGE_CSV = true;

% Authors-forums counts matrix
load( fullfile(data_dir, 'avmat_normalized_20150215.mat') );

% One version scaled with square root to use counts as weight
FF_sqrt = sqrt(auth_forums_norm' * auth_forums_norm);
% And one version starting with binary matrix
auth_forums_bin = double(auth_forums_norm > 0);
FF_bin = auth_forums_bin' * auth_forums_bin;

% Write out CSV of graph edge specifications
if WRITE_EDGE_CSV,
    
    % SQRT version
    % Since FF is symmetric, and we don't need self-connections
    % only grab upper triangular above diagonal for graph edges
    [r,c,v] = find(triu(FF_sqrt,1));
    % d3 wants 0-based indices/IDs, so subtract 1 from all rows and edges
    % also add an edge ID for d3 keeping track of edge data elements
    % will need to add edge_id,source,target,weight header later
    % csvwrite(fullfile(data_out_dir, edge_out_file), [[0:(length(r)-1)]' r-1 c-1 v]);
    fid = fopen(fullfile(data_dir, edge_sqrt_out_file), 'w');
	fprintf(fid, 'edge_id,source,target,weight\n');
    fclose(fid);
    dlmwrite(fullfile(data_dir, edge_sqrt_out_file), [[0:(length(r)-1)]' r-1 c-1 v], '-append', 'delimiter', ',');
    
    % BINARY version
    [r,c,v] = find(triu(FF_bin,1));
    fid = fopen(fullfile(data_dir, edge_bin_out_file), 'w');
	fprintf(fid, 'edge_id,source,target,weight\n');
    fclose(fid);
    dlmwrite(fullfile(data_dir, edge_bin_out_file), [[0:(length(r)-1)]' r-1 c-1 v], '-append', 'delimiter', ',');
    
end
