const fs = require('fs')

const phenolist = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))

phenolist.forEach(pheno => {
    console.log(pheno.phenocode + '\t' + pheno.phenostring + '\t' + pheno.category + '\t' + pheno.num_cases + '\t' + pheno.num_controls)
})
