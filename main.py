#Importamos las funciones necesarias para ejecutar el programa
from peliculas import ver_peliculas, agregar_pelicula, buscar_pelicula, eliminar_pelicula, modificar_pelicula
from persistencia import cargar_peliculas



def main():

    #Cargamos las películas guardadas al iniciar el programa
    lista_peliculas = cargar_peliculas()
    #Condicion While para no salir nunca del menú
    #Hasta que escriba 5 y salga de él
    while True:
    
        print("===========================")
        print("    GESTOR DE PELICULAS    ")
        print("===========================")
        print(" ")
        print("1. Agregar pelicula")
        print("2. Ver peliculas")
        print("3. Buscar pelicula")
        print("4. Eliminar pelicula")
        print("5. Modificar Pelicula")
        print("6. Salir")
        print(" ")
    
        while True:
            
    
            try:
                seleccion = int(input("Seleccione una opcion: "))
                
                if seleccion < 1 or seleccion > 6:
                    print("Debes ingresar un numero del 1 al 6.")
                else:
                    break
    
            except ValueError:
                print("Debe ingresar un numero.")
    
        #Condiciones para acceder a los diferentes menúes
        if seleccion == 1:
            agregar_pelicula(lista_peliculas)
            
        elif seleccion == 2:
            ver_peliculas(lista_peliculas)
    
        elif seleccion == 3:
    
            buscar_pelicula(lista_peliculas)
    
    
        elif seleccion == 4:
    
            eliminar_pelicula(lista_peliculas)

        elif seleccion == 5:
            modificar_pelicula(lista_peliculas)

        elif seleccion == 6:
            print("Elegiste salir")
            break
    

if __name__ == "__main__":
    main()