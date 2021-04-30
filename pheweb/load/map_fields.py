#from ..utils import PheWebError
import argparse
import glob
import gzip
import os

def patterns_args(patterns):
    files = []
    for p in patterns:
        files.extend(glob.iglob(p))
    return files


def rename_args(rename):
    lookup = {}
    for f in rename.split(","):
        if ":" in f:
            k,v = f.strip().split(":")
            lookup[k] = v
        else:
            raise Exception("Badly formed rename : '"+f+"'")
    return lookup

def exclude_args(exclude):
    return [ e for e in exclude.split(',') if e ]

assert exclude_args("") == []
assert exclude_args(",") == []
assert exclude_args("a,") == ["a"]
assert exclude_args("a,b") == ["a","b"]

def rename_header(line, rename):
    header = line.rstrip("\n").split("\t")
    header = map(lambda x : x if x not in rename else rename[x], header)
    header = "\t".join(header) + "\n"
    return header

assert rename_header("\n", []) == "\n"
assert rename_header("a\n", []) == "a\n"
assert rename_header("a\tb\n", []) == "a\tb\n"
assert rename_header("a\tb\tc\n" ,[]) == "a\tb\tc\n"

assert rename_header("\n", {"b" : "d"}) == "\n"
assert rename_header("a\n", {"b" : "d"}) == "a\n"
assert rename_header("a\tb\n", {"b" : "d"}) == "a\td\n"
assert rename_header("a\tb\tc\n", {"b" : "d"}) == "a\td\tc\n"

def exclude_index(header, exclude):
     return sorted([ header.index(e) for e in exclude if e in header], reverse=True)

assert exclude_index(["a","b","c","d"], []) == []
assert exclude_index(["a","b","c","d"], ["e"]) == []
assert exclude_index(["a","b","c","d"], ["a"]) == [0]
assert exclude_index(["a","b","c","d"], ["a","d","e"]) == [3,0]
assert exclude_index(["a","b","c","d"], ["a","b","c","d"]) == [3,2,1,0]
 
def exclude_line(exclude, line):
    line = line.rstrip("\n").split("\t")
    for e in exclude:
        del line[e]
    line = "\t".join(line) + "\n"
    return line

assert exclude_line([],"a\tb\tc\td\n") == "a\tb\tc\td\n"
assert exclude_line([0],"a\tb\tc\td\n") == "b\tc\td\n"
assert exclude_line([3,0],"a\tb\tc\td\n") == "b\tc\n"
assert exclude_line([3,2,1,0],"a\tb\tc\td\n") == "\n"

def process_tabix(f, rename, exclude):
    tmp_file = f+".tmp"
    opener = gzip.open if(f.endswith(".gz")) else open
    with opener(tmp_file, 'wt') as tmp_writer:
        with opener(f, 'rt') as f_reader:
            header = f_reader.readline()
            header = rename_header(header, rename)
            exclude = exclude_index(header, exclude)
            header = exclude_line(exclude, header)
            tmp_writer.write(header)
            for line in f_reader:
                line = exclude_line(exclude, line)
                tmp_writer.write(line)
    os.replace(tmp_file, f)


def run(argv):
    parser = argparse.ArgumentParser(description="Map fields")
    parser.add_argument('--rename_fields',
                        type=str,
                        help='rename fields new_name_1:old_name_1,new_name_2:old_name_2 ...')
    parser.add_argument('patterns',
                        nargs='*',
                        default=[],
                        help="one or more shell-glob patterns")
    parser.add_argument('--exclude_fields',
                        nargs = '?',
                        default="",
                        action='store',
                        type=str,
                        help='exclude fields : name1,name2,...')
    args = parser.parse_args(argv)
    rename =  rename_args(args.rename_fields)
    exclude = exclude_args(args.exclude)
    files = patterns_args(args.patterns)
    for f in files:
        process_tabix(f, rename, exclude)

if __name__ == "__main__":
    None
