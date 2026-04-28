import matplotlib.pyplot as plt
import pandas as pd
import psycopg2

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
df['age_group'] = pd.cut(df['age'], bins= 4, labels=['0-30', '31-50', '51-70', '71+'])
df['lifestyle_group'] = pd.cut(df['lifestyle_score'], bins= 4 , labels=['Healthy', 'Moderate', 'Risky', 'Very Risky'])

heatmap_data = df.pivot_table(index='lifestyle_group', columns='age_group', values='heart_disease', aggfunc='mean')
plt.figure()
plt.imshow(heatmap_data, cmap='Reds', aspect='auto')
cbar = plt.colorbar()
cbar.set_label('Percentage of People with Heart Disease')
ticks = cbar.get_ticks()
cbar.set_ticks(ticks)
cbar.set_ticklabels([f"{int(t*100)}%" for t in ticks])
plt.title('Heart Disease Risk by Age and Lifestyle')
plt.xlabel('Age Group')
plt.ylabel('Lifestyle (Smoking + Alcohol − Physical Activity)')
plt.xticks(ticks=range(len(heatmap_data.columns)), labels=heatmap_data.columns, rotation=45)
plt.yticks(ticks=range(len(heatmap_data.index)), labels=heatmap_data.index)
plt.tight_layout()
plt.savefig('risk_heatmap.png')
plt.show()

conn.close()