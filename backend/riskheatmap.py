import pandas as pd
import psycopg2

def generate_heatmap():
    conn = psycopg2.connect(
      host="localhost",
      database="healthcare",
      user="postgres",
      password="ott3r",
      port = 5432
)
    query = """
    SELECT 
      age,
      (smoking + alcohol_intake - physical_activity) AS lifestyle_score,
      heart_disease
    FROM patient;"""

    df = pd.read_sql_query(query, conn)
    conn.close()
    df['age_group'] = pd.cut(df['age'], bins= [0, 30, 50, 70, 120], labels=['0-30', '31-50', '51-70', '71+'], include_lowest=True)
    df['lifestyle_group'] = pd.cut(df['lifestyle_score'], bins= [-10, -1, 1, 3, 10] , labels=['Healthy', 'Moderate', 'Risky', 'Very Risky'], include_lowest=True )

    heatmap_data = df.pivot_table(index='lifestyle_group', columns='age_group', values='heart_disease', aggfunc='mean')
    heatmap_data = heatmap_data.reindex(
      index =['Healthy', 'Moderate', 'Risky', 'Very Risky'],
      columns=['0-30', '31-50', '51-70', '71+']
    )
    return {
      "x_labels": list(heatmap_data.columns.astype(str)),
      "y_labels": list(heatmap_data.index.astype(str)),
      "z_values": heatmap_data.fillna(0).values.tolist()
}