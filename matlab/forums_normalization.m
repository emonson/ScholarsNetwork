data_dir = '~/Dropbox/ScholarsData/newresults4visual';
forums_out_filename = 'forums_normalized_20150217.tsv';
matrix_out_filename = 'avmat_normalized_20150217.mat';
WRITE_OUTPUT_FILES = true;

% Angela's data on how to combine forums to normalize names
% [id, forum, modifiedid...] which I imported from the Excel file
load( fullfile(data_dir, 'forums_norm_20150210.mat') );
% Authors-forums counts matrix
load( fullfile(data_dir, 'avmat.mat') );

% Need to re-sort forums list by old ID or the rows won't match up with the
% matrix rows
% These are zero-based IDs, but we're not using them directly as indices
% here, so it doesn't matter than Matlab uses 1-based indexing
[YY,II] = sort(id);
old_id = id(II);
modified_id = modifiedid(II);
forums_norm = forum(II);

% Not modifying the original (Matlab will copy once something changes)
% Make it Forums x Authors for now.
avmat = avmat';
auth_forums_norm = avmat;

% Transposing because Matlab is weird about looping on wrong dimension...
unmodified = (old_id == modified_id)';

for ii = find(unmodified),
    % Put the sum of all rows with this modifiedid into this row
    auth_forums_norm(ii,:) = sum( avmat(modified_id == old_id(ii),:), 1);
end

% Delete all rows that weren't unmodified
auth_forums_norm(~unmodified,:) = [];
forums_norm(~unmodified) = [];
old_id(~unmodified) = [];

% Sum up number of publications per forum
n_pubs = sum(auth_forums_norm,2);

if WRITE_OUTPUT_FILES,
    % Write out TSV of normalized forums 
    n_forums = length(forums_norm);
    new_id = 0:(n_forums-1);
    fid = fopen( fullfile(data_dir, forums_out_filename), 'w');
	fprintf(fid, 'id\torig_id\tpub_count\tforum\n');
    for ii = 1:n_forums,
        fprintf(fid, '%d\t%d\t%d\t%s\n', new_id(ii), old_id(ii), n_pubs(ii), forums_norm{ii});
    end
    fclose(fid);
    
    % and matlab matrix of authors x forums_norm (transpose back to orig)
    avmat = avmat';
    auth_forums_norm = auth_forums_norm';
    save(fullfile(data_dir, matrix_out_filename), 'auth_forums_norm');
end
