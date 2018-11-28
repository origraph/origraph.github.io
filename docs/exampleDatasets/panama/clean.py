#!/usr/bin/env python
import csv
import argparse

parser = argparse.ArgumentParser(description='Strip unnecessary stuff from panama papers data')
parser.add_argument('-i', '--input', dest='input', default='input.csv',
                    help='The input file (default=input.csv)')
parser.add_argument('-o', '--output', dest='output', default='output.csv',
                    help='The output file')

args = parser.parse_args()

infile = open(args.input, 'rU')
outfile = open(args.output, 'wb')

attrsToDelete = ['note', 'sourceID', 'valid_until']

reader = csv.DictReader(infile)
headers = list(reader.fieldnames)
for attr in attrsToDelete:
    try:
        headers.remove(attr)
    except ValueError:
        pass
writer = csv.DictWriter(outfile, headers)
writer.writeheader()

for rowNumber, line in enumerate(reader):
    for attr in attrsToDelete:
        if line.get(attr) is not None:
            del line[attr]
    writer.writerow(line)

    if rowNumber % 100 == 0:
        print '.',
    if rowNumber % 1000 == 0:
        print 'processed %i rows' % rowNumber

infile.close()
outfile.close()
