authentication=False
authentication_file = "/mnt/nfs/pheweb/r2/google.r2.conf"

data_dir="/mnt/nfs/pheweb/r2/"

cache="/mnt/nfs/pheweb/r2/cache/"

database_conf = ({ "annotation":
                   { "TabixAnnotationDao": { "matrix_path": "/mnt/nfs/annotations/r2/annotated_variants.gz" } }
                 },
                 { "result": { "TabixResultDao": { 'const_arguments': [("phenos","PHEWEB_PHENOS"), ("matrix_path","MATRIX_PATH")] } } },
                 {
                     "gnomad": {
                         "TabixGnomadDao": { "matrix_path": "/mnt/nfs/annotations/gnomad20/gnomad.genomes.r2.0.2.sites.chrALL.liftover.b38.af.finngen.tsv.gz" }
                     }
                 },
                 {
                     "lof": {
                         "LofMySQLDao": { "authentication_file": "/mnt/nfs/pheweb/r2/mysql.conf" }
                     }
                 }, {
                     "externalresultmatrix": {
                         "ExternalMatrixResultDao": {"matrix":"/mnt/nfs/ukbb_neale/matrix.tsv.gz", "metadatafile":"/mnt/nfs/ukbb_neale/ukbb_r1_match_pheno_dup_correct_simple_meta.tsv"}
                     }
                 }, {
                     "externalresult": {
                         "ExternalFileResultDao": {"manifest":"/mnt/nfs/ukbb_neale/ukbb_r1_match_pheno_dup_correct_ssd.tsv"}
                    }
                 }
                )

report_conf = {"func_var_assoc_threshold":0.0001, "gene_top_assoc_threshold":0.0001}
