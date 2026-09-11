from persistencia import guardar_peliculas

#Funciones auxiliares
def encontrar_pelicula(lista_peliculas, nombre_buscado):
    
    for pelicula in lista_peliculas:
        if nombre_buscado == pelicula["nombre"].lower():
            return pelicula

    return None

def mostrar_pelicula(pelicula):

    print(f"Nombre: {pelicula['nombre']}")
    print(f"Año: {pelicula['año']}")
    print(f"Género: {pelicula['genero']}")
    print(f"Puntuación: {pelicula['puntuacion']}")

def pedir_anio():
    while True:
    
        try:
            anio_pelicula = int(input("Ingrese el año de la pelicula: "))
            
            if 0 < anio_pelicula <= 2026:
                return anio_pelicula
            
            else:
                print("Debes ingresar un año valido")

        except ValueError:
            print("Debes ingresar un numero")

def pedir_puntuacion():
    while True:
        #Creamos un bucle que se repetirá todo el tiempo
        #hasta que se ejecute un break.

        try:
            puntuacion_pelicula = int(
                input("Puntuacion de la pelicula (del 1 al 10): ")
            )

            if 1 <= puntuacion_pelicula <= 10:
                return puntuacion_pelicula

            else:
                print("La puntuacion debe ser entre 1 y 10.")

        except ValueError:
            # Entramos acá si int() no pudo convertir el dato. Por ejemplo que ponga un texto
            print("Ingrese un numero.")

def pedir_texto(mensaje, mensaje_error):
    while True:
        valor = input(mensaje).strip()

        if valor:
            return valor

        print(mensaje_error)
    

#Funciones para acceder al menú
def ver_peliculas(lista_peliculas):
    
    if lista_peliculas:
        #Recorremos cada pelicula de lista_peliculas
        for i, pelicula in enumerate(lista_peliculas, start=1):
            print(f"\nPelicula {i}")
            #Recorremos cada clave y valor del diccionario pelicula
            mostrar_pelicula(pelicula)
            print("----------------------------")

    else:
        print("No hay peliculas cargadas.")

def agregar_pelicula(lista_peliculas):

    print("Elegiste agregar una pelicula.\n")
    
    #Guardamos los valores que ingrese el usuario sobre cada pelicula

    
    nombre_pelicula = pedir_texto(
        "Ingrese el nombre de la película: ",
        "Debes ingresar un nombre."
    )
    
    #Pedimos el año de la pelicula
    anio_pelicula = pedir_anio()
    

    #Genero de la pelicula
    genero_pelicula = pedir_texto(
        "Ingrese el género de la pelicula: ",
        "Debes ingresar el genero de la pelicula."
    )

    #validacion para que la puntuacion sea del 1 al 10
    puntuacion_pelicula = pedir_puntuacion()

    
    #Creamos un diccionario pelicula para guardar cada pelicula
    pelicula = {
        "nombre": nombre_pelicula,
        "año": anio_pelicula,
        "genero": genero_pelicula,
        "puntuacion": puntuacion_pelicula
    }
    #Metemos cada pelicula de ese diccionario en la lista de peliculas que creamos antes
    lista_peliculas.append(pelicula)
    mostrar_pelicula(pelicula)
    guardar_peliculas(lista_peliculas)

def buscar_pelicula(lista_peliculas):
    
    if not lista_peliculas:
        print("No hay peliculas cargadas.")
        return


    nombre_buscado = pedir_texto(
        "Ingrese el nombre de la pelicula: ",
        "Debes ingresar el nombre de la pelicula."
    ).strip().lower()
    
    pelicula_encontrada = encontrar_pelicula(lista_peliculas, nombre_buscado)
    #Si encontramos la pelicula la mostramos, si no, mostramos mensaje de que no se encontro
    if pelicula_encontrada:
        mostrar_pelicula(pelicula_encontrada)
    else:
        print("No se encontro la pelicula.")

def eliminar_pelicula(lista_peliculas):

    if not lista_peliculas:
        print("No hay peliculas cargadas.")
        return

    nombre_buscado = pedir_texto(
        "Ingrese el nombre de la pelicula: ",
        "Debes ingresar el nombre de la pelicula."
    ).strip().lower()

    pelicula_encontrada = encontrar_pelicula(lista_peliculas, nombre_buscado)
    #Si encontramos la pelicula la eliminamos, si no, mostramos mensaje de que no se encontro
    if pelicula_encontrada:
        lista_peliculas.remove(pelicula_encontrada)
        guardar_peliculas(lista_peliculas)
        print("\nPelicula eliminada:")
        mostrar_pelicula(pelicula_encontrada)
    else:
        print("No se encontro la pelicula.")

def modificar_pelicula(lista_peliculas):

    #Si no hay peliculas cargadas retornamos para no seguir con la lógica
    if not lista_peliculas:
        print("No hay peliculas cargadas.")
        return

    #Buscamos la pelicula que queremos encontrar:
    while True:
        nombre_buscado = input("Ingrese el nombre de la pelicula: ").strip().lower()

        if not nombre_buscado:
            print("Debes ingresar un nombre de pelicula.")
        else:
            break

    
    pelicula_encontrada = encontrar_pelicula(
        lista_peliculas,
        nombre_buscado
    )

    if pelicula_encontrada:

        mostrar_pelicula(pelicula_encontrada)

        print("=======================")
        print("Que desea modificar?")
        print("1. Modificar nombre")
        print("2. Modificar año")
        print("3. Modificar género")
        print("4. Modificar puntuación")
        print("5. Volver")
        print("=======================")

        while True:
                    
            try:
                seleccion = int(input("Seleccione una opcion: "))
                
                if seleccion < 1 or seleccion > 5:
                    print("Debes ingresar un numero del 1 al 5.")
                else:
                    break
    
            except ValueError:
                print("Debe ingresar un numero.")

        if seleccion == 5:
            return

        if seleccion == 1:
            nuevo_nombre = pedir_texto(
                "Ingrese el nuevo nombre de la pelicula: ",
                "Debes ingresar un nombre."
            )
            pelicula_encontrada["nombre"] = nuevo_nombre
            
        elif seleccion == 2:
            nuevo_anio = pedir_anio()
            pelicula_encontrada["año"] = nuevo_anio

        elif seleccion == 3:
            nuevo_genero = pedir_texto(
                "Ingrese el nuevo género de la pelicula: ",
                "Debes ingresar el genero de la pelicula."
            )
            pelicula_encontrada["genero"] = nuevo_genero          
        
        elif seleccion == 4:
            nueva_puntuacion = pedir_puntuacion()
            pelicula_encontrada["puntuacion"] = nueva_puntuacion

        guardar_peliculas(lista_peliculas)
        print("\nPelicula actualizada:")
        mostrar_pelicula(pelicula_encontrada)

    else:
        print("No existe una pelicula con ese nombre")

    
