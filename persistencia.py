import json

#Funcion para guardar las peliculas en formato .json
def guardar_peliculas(lista_peliculas):
    with open('peliculas.json', 'w', encoding="utf-8") as file: #encoding lo usamos para que se lean bien los acentos
        json.dump(lista_peliculas, file, indent=4, ensure_ascii=False) #'w' = significa write, abre una escritura y reemplaza el contenido anterior

#Funcion para que las peliculas del archivo peliculas.json esten cargadas en formato python
def cargar_peliculas():

    try:
        with open('peliculas.json', 'r', encoding="utf-8") as file:
                    peliculas = json.load(file)
            
        return peliculas

    except FileNotFoundError:
        return []

    except json.JSONDecodeError:
        return []