using EDEEste.AdPlay.Domain.Entities;
using EDEEste.AdPlay.Domain.Services;

namespace EDEEste.AdPlay.Tests.Domain
{
    public class JerarquiaGruposTests
    {
        // 1 (raíz) -> 2 -> 3
        private static Dictionary<int, GrupoPantalla> Arbol() => new()
        {
            [1] = new GrupoPantalla { Id = 1 },
            [2] = new GrupoPantalla { Id = 2, GrupoPadreId = 1 },
            [3] = new GrupoPantalla { Id = 3, GrupoPadreId = 2 }
        };

        [Fact]
        public void ObtenerCadena_devuelve_el_grupo_y_sus_ancestros_del_mas_cercano_al_mas_lejano()
        {
            Assert.Equal([3, 2, 1], JerarquiaGrupos.ObtenerCadena(3, Arbol()));
        }

        [Fact]
        public void ObtenerCadena_con_grupo_desconocido_devuelve_vacio()
        {
            Assert.Empty(JerarquiaGrupos.ObtenerCadena(99, Arbol()));
        }

        [Fact]
        public void ObtenerCadena_se_detiene_ante_un_ciclo_corrupto()
        {
            var grupos = Arbol();
            grupos[1].GrupoPadreId = 3;

            Assert.Equal([3, 2, 1], JerarquiaGrupos.ObtenerCadena(3, grupos));
        }

        [Theory]
        [InlineData(1, 1, true)]   // ser padre de sí mismo
        [InlineData(1, 3, true)]   // un descendiente como padre
        [InlineData(3, 1, false)]  // mover un hijo bajo un ancestro es válido
        [InlineData(2, 3, true)]
        public void CreariaCiclo_detecta_padres_que_son_el_grupo_o_sus_descendientes(int grupo, int nuevoPadre, bool esperado)
        {
            Assert.Equal(esperado, JerarquiaGrupos.CreariaCiclo(grupo, nuevoPadre, Arbol()));
        }
    }
}
