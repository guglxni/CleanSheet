export const SAMPLE_NAME = "harbor-orders.csv";

/**
 * Harbor & Co. orders. Eighteen data rows with three exact copies,
 * blank city/item/qty/total cells, a whitespace-only customer,
 * a quoted comma ("Hale, Jonah"), an escaped quote (Okafor "Nia" Blake),
 * and a plainly quoted name ("Mina Cho").
 */
export const SAMPLE_CSV = [
  "order_id,customer,city,item,qty,total",
  "HO-1042,Mara Ellison,Portland,Notebook,2,24.00",
  'HO-1043,"Hale, Jonah",Seattle,Mug,1,18.00',
  "HO-1044,Priya Shah,Austin,Tote,1,32.00",
  "HO-1045,Jonah Hale,Denver,Pen,6,15.00",
  'HO-1046,"Okafor ""Nia"" Blake",Chicago,Scarf,1,28.00',
  "HO-1047,Elena Voss,Boston,Notebook,3,36.00",
  "HO-1048,Chris Adeyemi,,Mug,2,36.00",
  "HO-1049,Samir Patel,Portland,,4,48.00",
  "HO-1050,Leah Kim,Seattle,Tote,,32.00",
  "HO-1051,Noah Brooks,Austin,Pen,12,",
  "HO-1042,Mara Ellison,Portland,Notebook,2,24.00",
  "HO-1052,   ,Denver,Scarf,1,28.00",
  'HO-1053,"Mina Cho",Chicago,Notebook,1,12.00',
  "HO-1054,Owen Blake,Boston,Mug,3,54.00",
  "HO-1044,Priya Shah,Austin,Tote,1,32.00",
  "HO-1055,Greta Holm,Portland,Pen,3,7.50",
  'HO-1046,"Okafor ""Nia"" Blake",Chicago,Scarf,1,28.00',
  "HO-1056,Jonah Hale,Seattle,Tote,2,64.00",
].join("\n").concat("\n");
